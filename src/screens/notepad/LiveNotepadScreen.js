import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, StatusBar, Modal, Share, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Globe, Lock, Unlock, Share2, Shuffle, Users, KeyRound, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

const RECENT_KEY = '@notepad_pw_recent_rooms';
const CACHE_PREFIX = '@notepad_pw_room_';
const genRoom = () => Array.from({ length: 6 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');

const hashPwd = (pwd, room) => {
  if (!pwd) return null;
  const s = `${room.trim().toLowerCase()}::${pwd.trim()}::np_salt`;
  let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

export default function LiveNotepadScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const clientId = useRef(`u_${Math.random().toString(36).slice(2, 9)}`).current;
  const [roomCode, setRoomCode] = useState(() => genRoom());
  const [roomInput, setRoomInput] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Connecting...');
  const [onlineCount, setOnlineCount] = useState(1);
  const [peerTyping, setPeerTyping] = useState(false);
  const [pwdHash, setPwdHash] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockErr, setUnlockErr] = useState('');
  const [pwdModal, setPwdModal] = useState(false);
  const [newPwdInput, setNewPwdInput] = useState('');

  const channelRef = useRef(null);
  const saveTimer = useRef(null);
  const typingTimer = useRef(null);
  const contentRef = useRef('');
  const pwdRef = useRef(null);

  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { pwdRef.current = pwdHash; }, [pwdHash]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((v) => v && setRecentRooms(JSON.parse(v))).catch(() => {});
  }, []);

  const saveRecent = useCallback((code) => {
    const clean = code.trim().toLowerCase();
    setRecentRooms((prev) => {
      const next = [clean, ...prev.filter((r) => r !== clean)].slice(0, 8);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const persistRoom = useCallback(async (room, text, hash) => {
    const now = new Date().toISOString();
    AsyncStorage.setItem(`${CACHE_PREFIX}${room}`, JSON.stringify({ room_code: room, content: text, password_hash: hash || null, updated_at: now })).catch(() => {});
    try {
      const { error } = await supabase.from('notepad_rooms').upsert(
        { room_code: room, content: text, password_hash: hash || null, is_locked: Boolean(hash), updated_at: now },
        { onConflict: 'room_code' }
      );
      setSyncStatus(error ? 'Live (Broadcast)' : 'Synced Live');
    } catch {
      setSyncStatus('Live (Broadcast)');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const room = roomCode.trim().toLowerCase();
    setRoomInput(room);
    setLoading(true);
    setSyncStatus('Connecting...');
    setUnlockErr('');
    setUnlockInput('');
    saveRecent(room);

    (async () => {
      let initText = '', initHash = null, fromDb = false;
      try {
        const { data, error } = await supabase.from('notepad_rooms').select('content, password_hash').eq('room_code', room).maybeSingle();
        if (!error && data) { initText = data.content || ''; initHash = data.password_hash || null; fromDb = true; }
      } catch {}
      if (!fromDb) {
        try {
          const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${room}`);
          if (cached) { const p = JSON.parse(cached); initText = p.content || ''; initHash = p.password_hash || null; }
        } catch {}
      }
      if (!mounted) return;
      setContent(initText); contentRef.current = initText;
      setPwdHash(initHash); pwdRef.current = initHash;
      setIsUnlocked(!initHash);
      setLoading(false);

      if (channelRef.current) supabase.removeChannel(channelRef.current);
      const ch = supabase.channel(`np_room_${room}`, { config: { broadcast: { self: false }, presence: { key: clientId } } });

      ch.on('broadcast', { event: 'text_update' }, ({ payload }) => {
        if (!mounted || !payload || payload.senderId === clientId) return;
        if (typeof payload.content === 'string') { setContent(payload.content); contentRef.current = payload.content; }
        if (payload.passwordHash !== undefined) {
          setPwdHash(payload.passwordHash); pwdRef.current = payload.passwordHash;
          if (!payload.passwordHash) setIsUnlocked(true);
        }
        setSyncStatus('Synced Live');
        setPeerTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => mounted && setPeerTyping(false), 1200);
      });

      ch.on('broadcast', { event: 'lock_update' }, ({ payload }) => {
        if (!mounted || !payload) return;
        const h = payload.passwordHash || null;
        setPwdHash(h); pwdRef.current = h;
        if (!h) setIsUnlocked(true);
        else if (payload.senderId !== clientId) setIsUnlocked(false);
      });

      ch.on('broadcast', { event: 'request_sync' }, ({ payload }) => {
        if (!mounted || !payload || payload.senderId === clientId) return;
        if (contentRef.current || pwdRef.current) {
          ch.send({ type: 'broadcast', event: 'sync_snapshot', payload: { content: contentRef.current, passwordHash: pwdRef.current } });
        }
      });

      ch.on('broadcast', { event: 'sync_snapshot' }, ({ payload }) => {
        if (!mounted || !payload) return;
        if (typeof payload.content === 'string' && payload.content !== contentRef.current) { setContent(payload.content); contentRef.current = payload.content; }
        if (payload.passwordHash && !pwdRef.current) { setPwdHash(payload.passwordHash); pwdRef.current = payload.passwordHash; setIsUnlocked(false); }
      });

      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'notepad_rooms', filter: `room_code=eq.${room}` }, (chg) => {
        if (!mounted || !chg.new) return;
        if (typeof chg.new.content === 'string' && chg.new.content !== contentRef.current) { setContent(chg.new.content); contentRef.current = chg.new.content; }
        if (chg.new.password_hash !== pwdRef.current) {
          const h = chg.new.password_hash || null;
          setPwdHash(h); pwdRef.current = h;
          if (!h) setIsUnlocked(true);
        }
      });

      ch.on('presence', { event: 'sync' }, () => mounted && setOnlineCount(Math.max(1, Object.keys(ch.presenceState()).length)));

      ch.subscribe(async (st) => {
        if (!mounted) return;
        if (st === 'SUBSCRIBED') {
          setSyncStatus('Synced Live');
          await ch.track({ user_id: clientId });
          ch.send({ type: 'broadcast', event: 'request_sync', payload: { senderId: clientId } });
        }
      });
      channelRef.current = ch;
    })();

    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [roomCode, clientId, saveRecent]);

  const onType = (txt) => {
    setContent(txt); contentRef.current = txt; setSyncStatus('Syncing...');
    const room = roomCode.trim().toLowerCase();
    channelRef.current?.send({ type: 'broadcast', event: 'text_update', payload: { senderId: clientId, content: txt, passwordHash: pwdRef.current } });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistRoom(room, txt, pwdRef.current), 350);
  };

  const joinRoom = () => {
    const clean = roomInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) return Alert.alert('Invalid Room', 'Enter a room code like 1234.');
    if (clean !== roomCode) setRoomCode(clean);
  };

  const unlockRoom = () => {
    if (hashPwd(unlockInput, roomCode) === pwdHash) { setIsUnlocked(true); setUnlockErr(''); setUnlockInput(''); }
    else setUnlockErr('Incorrect password for this room.');
  };

  const savePassword = async (overrideBlank = false) => {
    const raw = overrideBlank ? '' : newPwdInput.trim();
    const room = roomCode.trim().toLowerCase();
    const nextHash = raw ? hashPwd(raw, room) : null;
    setPwdHash(nextHash); pwdRef.current = nextHash; setIsUnlocked(true); setPwdModal(false); setNewPwdInput('');
    channelRef.current?.send({ type: 'broadcast', event: 'lock_update', payload: { senderId: clientId, passwordHash: nextHash } });
    await persistRoom(room, contentRef.current, nextHash);
    Alert.alert(nextHash ? 'Password Set 🔒' : 'Password Removed 🔓', nextHash ? `Room /${room} now requires a password.` : `Room /${room} is now open to anyone.`);
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <KeyboardAvoidingView style={[styles.safe, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}><ArrowLeft stroke="#1E293B" size={20} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.row}>
            <Globe stroke="#0EA5E9" size={17} />
            <Text style={styles.title}>notepad.pw</Text>
            <View style={styles.badge}><View style={styles.dot} /><Text style={styles.badgeTxt}>{syncStatus}</Text></View>
          </View>
          <Text style={styles.sub}>Real-time shared notes & instant chatroom</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, pwdHash && styles.lockedBtn]}
          onPress={() => (pwdHash && !isUnlocked ? Alert.alert('Locked', 'Unlock room first to edit password.') : (setNewPwdInput(''), setPwdModal(true)))}
        >
          {pwdHash ? <Lock stroke="#EA580C" size={18} /> : <Unlock stroke="#64748B" size={18} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={() => Share.share({ message: `Join my live Notepad room: notepad.pw/${roomCode} (Code: ${roomCode})` })}>
          <Share2 stroke="#0EA5E9" size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.urlBar}>
        <View style={styles.urlBox}>
          <Text style={styles.prefix}>notepad.pw/</Text>
          <TextInput style={styles.urlIn} value={roomInput} onChangeText={setRoomInput} placeholder="1234" autoCapitalize="none" autoCorrect={false} onSubmitEditing={joinRoom} />
          {roomInput.trim().toLowerCase() !== roomCode && (
            <TouchableOpacity style={styles.goBtn} onPress={joinRoom}><Text style={styles.goTxt}>Go</Text></TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.randBtn} onPress={() => setRoomCode(genRoom())}>
          <Shuffle stroke="#0284C7" size={15} /><Text style={styles.randTxt}>Random</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metaBar}>
        <View style={styles.onlinePill}>
          <Users stroke="#0284C7" size={13} />
          <Text style={styles.onlineTxt}>{onlineCount} online{peerTyping ? ' • typing...' : ''}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {recentRooms.map((r) => (
            <TouchableOpacity key={r} style={[styles.chip, r === roomCode && styles.chipOn]} onPress={() => setRoomCode(r)}>
              <Text style={[styles.chipTxt, r === roomCode && { color: '#FFF' }]}>/{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#0EA5E9" /><Text style={styles.sub}>Joining notepad.pw/{roomCode}...</Text></View>
      ) : pwdHash && !isUnlocked ? (
        <View style={styles.center}>
          <View style={styles.lockCard}>
            <KeyRound stroke="#EA580C" size={34} />
            <Text style={styles.lockTitle}>Room /{roomCode} is Password Protected</Text>
            <Text style={styles.lockSub}>Enter the room password to view and edit this live notepad.</Text>
            <TextInput style={styles.pwdIn} value={unlockInput} onChangeText={(t) => { setUnlockInput(t); setUnlockErr(''); }} placeholder="Enter room password..." secureTextEntry autoCapitalize="none" onSubmitEditing={unlockRoom} />
            {unlockErr ? <Text style={styles.errTxt}>{unlockErr}</Text> : null}
            <TouchableOpacity style={styles.unlockBtn} onPress={unlockRoom}><Text style={styles.goTxt}>Unlock Room</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setRoomCode(genRoom())} style={{ marginTop: 14 }}><Text style={styles.randTxt}>Or switch to a new random room</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
          <TextInput
            style={styles.editor}
            multiline
            value={content}
            onChangeText={onType}
            placeholder={`Room: notepad.pw/${roomCode}\n\n• Anyone who opens room "${roomCode}" sees what you type in real time.\n• Type a custom code like "1234" above to join a shared room.\n• Tap the lock icon above to add an optional password.`}
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Text style={styles.sub}>{words} words • {content.length} chars {pwdHash ? '• 🔒 Password ON' : ''}</Text>
            <TouchableOpacity style={styles.row} onPress={() => onType('')}><Trash2 stroke="#EF4444" size={14} /><Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Clear</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={pwdModal} transparent animationType="fade" onRequestClose={() => setPwdModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.lockCard}>
            <Text style={styles.lockTitle}>Room Password (Optional)</Text>
            <Text style={styles.lockSub}>Set a password for notepad.pw/{roomCode} so only people with the password can access it.</Text>
            <TextInput style={styles.pwdIn} value={newPwdInput} onChangeText={setNewPwdInput} placeholder={pwdHash ? 'New password (or Remove below)' : 'Optional password...'} secureTextEntry autoCapitalize="none" />
            <View style={[styles.row, { justifyContent: 'flex-end', width: '100%', gap: 8 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPwdModal(false)}><Text style={styles.chipTxt}>Cancel</Text></TouchableOpacity>
              {pwdHash && <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => savePassword(true)}><Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>Remove Lock</Text></TouchableOpacity>}
              <TouchableOpacity style={[styles.goBtn, { paddingVertical: 10 }]} onPress={() => savePassword(false)}><Text style={styles.goTxt}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, borderWidth: 1, borderColor: '#BBF7D0' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  iconBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  lockedBtn: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  urlBar: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  urlBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: '#CBD5E1' },
  prefix: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  urlIn: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0F172A', paddingVertical: 0 },
  goBtn: { backgroundColor: '#0EA5E9', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  goTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  randBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 12, borderRadius: 10, gap: 5 },
  randTxt: { fontSize: 13, fontWeight: '700', color: '#0284C7' },
  metaBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, gap: 5 },
  onlineTxt: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#E2E8F0' },
  chipOn: { backgroundColor: '#0F172A' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#475569' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockCard: { width: '100%', maxWidth: 380, backgroundColor: '#FFF', borderRadius: 18, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  lockTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 10, textAlign: 'center' },
  lockSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginVertical: 10, lineHeight: 18 },
  pwdIn: { width: '100%', height: 44, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, color: '#0F172A' },
  errTxt: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  unlockBtn: { width: '100%', height: 44, backgroundColor: '#EA580C', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editor: { flex: 1, padding: 16, fontSize: 15, lineHeight: 22, color: '#0F172A', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderColor: '#E2E8F0' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: '#F1F5F9' },
});
