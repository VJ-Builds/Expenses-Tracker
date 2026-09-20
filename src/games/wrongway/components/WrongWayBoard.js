/**
 * Wrong Way: Don't be mad - Interactive Game Board Component
 * Renders dynamic grid, animated marble pawns with halo orbit rings, placed walls,
 * ghost wall placement preview, valid move tap targets, chaos crates, and golden hammers.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { FONTS } from '../../../constants/theme';
import { PLAYER_COLORS, THEME, MAP_TYPES } from '../constants/wrongWayConstants';
import { isSteelWall } from '../engine/boardLogic';
import ShatteringWall from './ShatteringWall';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WrongWayBoard({
  rows = 9,
  cols = 9,
  mapType = MAP_TYPES.DUEL,
  tokens = {}, // { A: { r, c }, B: { r, c } } or 2v2 { A1, A2, B1, B2 }
  walls = new Set(),
  wallOwners = {}, // { [wallKey]: 'A' | 'B' | 'PRESET' | 'SKY' }
  goalRows = null, // { A: 0, B: rows - 1 }
  activeTurn = 'A',
  validMoves = [],
  onCellPress,
  wallPlacementMode = null, // 'H' | 'V' | null
  previewWallKey = null,
  isPreviewValid = true,
  onGridIntersectionPress,
  chaosItem = null, // { r, c }
  hammers = [],     // [{ r, c, id }]
  hammerModeActive = false,
  breakingWall = null, // { key, color }
  onShatterComplete,
  darkMode = true,
}) {
  const theme = darkMode ? THEME.dark : THEME.light;

  // Responsive cell size calculation with both width and height bounds
  const boardPadding = 12;
  const availableWidth = Math.min(SCREEN_WIDTH - boardPadding * 2, 420);
  const maxAvailableHeight = Math.min(SCREEN_HEIGHT * 0.46, 440);
  const maxCellFromWidth = Math.floor(availableWidth / cols);
  const maxCellFromHeight = Math.floor(maxAvailableHeight / rows);
  const cellSize = Math.max(26, Math.min(maxCellFromWidth, maxCellFromHeight));
  const boardWidth = cellSize * cols;
  const boardHeight = cellSize * rows;

  const wallThickness = 6;

  // Parse placed walls into renderable elements with player-specific colors
  const renderedWalls = useMemo(() => {
    const list = [];
    walls.forEach(key => {
      const [type, rs, cs] = key.split('-');
      const r = parseInt(rs, 10);
      const c = parseInt(cs, 10);
      const isSteel = isSteelWall(key, mapType, rows);
      const owner = wallOwners[key];

      let wallBg = theme.wallColor;
      let wallShadow = theme.wallShadow;

      if (isSteel) {
        wallBg = theme.steelWall;
        wallShadow = '#EF4444';
      } else if (owner === 'A' || owner === 'A1' || owner === 'A2') {
        wallBg = PLAYER_COLORS.A.primary;
        wallShadow = PLAYER_COLORS.A.primary;
      } else if (owner === 'B' || owner === 'B1' || owner === 'B2') {
        wallBg = PLAYER_COLORS.B.primary;
        wallShadow = PLAYER_COLORS.B.primary;
      } else if (owner === 'PRESET') {
        wallBg = darkMode ? '#94A3B8' : '#64748B'; // Cool neutral stone
        wallShadow = 'rgba(0,0,0,0.5)';
      } else if (owner === 'SKY') {
        wallBg = '#F59E0B'; // Amber sky drop
        wallShadow = '#F59E0B';
      }

      if (type === 'H') {
        list.push({
          key,
          type: 'H',
          isSteel,
          style: {
            position: 'absolute',
            left: c * cellSize,
            top: (r + 1) * cellSize - wallThickness / 2,
            width: 2 * cellSize,
            height: wallThickness,
            backgroundColor: wallBg,
            borderRadius: wallThickness / 2,
            zIndex: 10,
            shadowColor: wallShadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 6,
          },
        });
      } else {
        list.push({
          key,
          type: 'V',
          isSteel: false,
          style: {
            position: 'absolute',
            left: (c + 1) * cellSize - wallThickness / 2,
            top: r * cellSize,
            width: wallThickness,
            height: 2 * cellSize,
            backgroundColor: wallBg,
            borderRadius: wallThickness / 2,
            zIndex: 10,
            shadowColor: wallShadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 6,
          },
        });
      }
    });
    return list;
  }, [walls, wallOwners, cellSize, mapType, rows, theme, darkMode]);

  // Preview Ghost Wall
  const ghostWall = useMemo(() => {
    if (!previewWallKey) return null;
    const [type, rs, cs] = previewWallKey.split('-');
    const r = parseInt(rs, 10);
    const c = parseInt(cs, 10);
    const isH = type === 'H';

    const glowColor = isPreviewValid ? '#10B981' : '#EF4444';

    return {
      style: {
        position: 'absolute',
        left: isH ? c * cellSize : (c + 1) * cellSize - wallThickness / 2,
        top: isH ? (r + 1) * cellSize - wallThickness / 2 : r * cellSize,
        width: isH ? 2 * cellSize : wallThickness,
        height: isH ? wallThickness : 2 * cellSize,
        backgroundColor: isPreviewValid ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)',
        borderRadius: wallThickness / 2,
        borderWidth: 1,
        borderColor: glowColor,
        zIndex: 20,
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 8,
      },
    };
  }, [previewWallKey, isPreviewValid, cellSize]);

  // Check if a cell is valid move
  const isCellValidMove = (r, c) => {
    return validMoves.some(m => m.r === r && m.c === c);
  };

  return (
    <View style={[styles.container, { padding: boardPadding }]}>
      {/* Main Board Grid with Player-Colored Finish Line Borders */}
      <View
        style={[
          styles.board,
          {
            width: boardWidth,
            height: boardHeight,
            backgroundColor: theme.boardBg,
            borderTopColor: (mapType === MAP_TYPES.CLASSIC) ? '#F59E0B' : PLAYER_COLORS.A.primary,
            borderTopWidth: 3.5,
            borderBottomColor: (mapType === MAP_TYPES.CLASSIC) ? theme.cardBorder : PLAYER_COLORS.B.primary,
            borderBottomWidth: (mapType === MAP_TYPES.CLASSIC) ? 1.5 : 3.5,
            borderLeftColor: theme.cardBorder,
            borderRightColor: theme.cardBorder,
            borderLeftWidth: 1.5,
            borderRightWidth: 1.5,
          },
        ]}
      >
        {/* Render Cells */}
        {Array.from({ length: rows }).map((_, r) => (
          <View key={`row-${r}`} style={styles.gridRow}>
            {Array.from({ length: cols }).map((_, c) => {
              const isValid = isCellValidMove(r, c);
              const isChaos = chaosItem && chaosItem.r === r && chaosItem.c === c;
              const hammer = hammers.find(h => h.r === r && h.c === c);

              // Find which token is on this cell
              const occupantId = Object.keys(tokens).find(
                id => tokens[id] && tokens[id].r === r && tokens[id].c === c
              );
              const isOccupied = !!occupantId;
              const isCurrentTurnToken = occupantId === activeTurn;
              const tokenColor = occupantId ? PLAYER_COLORS[occupantId] : null;

              // Check if cell is in a player's finish line / goal row
              const isGoalA = goalRows
                ? (goalRows.A === r || goalRows.A1 === r || goalRows.A2 === r)
                : (r === 0);
              const isGoalB = goalRows
                ? (goalRows.B === r || goalRows.B1 === r || goalRows.B2 === r)
                : (mapType === MAP_TYPES.DUEL || mapType === MAP_TYPES.TWO_V_TWO ? r === rows - 1 : false);
              const isClassicGoal = mapType === MAP_TYPES.CLASSIC && r === 0;

              let cellBg = (r + c) % 2 === 0 ? theme.cellBg : theme.cellHover;

              if (isGoalA) {
                // Player A / Team Red Finish Line: Light Red Tint
                cellBg = (r + c) % 2 === 0
                  ? (darkMode ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.10)')
                  : (darkMode ? 'rgba(239, 68, 68, 0.11)' : 'rgba(239, 68, 68, 0.06)');
              } else if (isGoalB) {
                // Player B / Team Blue Finish Line: Light Blue Tint
                cellBg = (r + c) % 2 === 0
                  ? (darkMode ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.10)')
                  : (darkMode ? 'rgba(59, 130, 246, 0.11)' : 'rgba(59, 130, 246, 0.06)');
              } else if (isClassicGoal) {
                // Classic Race: Shared Goal Line
                cellBg = (r + c) % 2 === 0
                  ? (darkMode ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.10)')
                  : (darkMode ? 'rgba(245, 158, 11, 0.11)' : 'rgba(245, 158, 11, 0.06)');
              }

              return (
                <TouchableOpacity
                  key={`cell-${r}-${c}`}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: cellBg,
                      borderColor: theme.boardGrid,
                    },
                    isValid && {
                      backgroundColor: 'rgba(139, 92, 246, 0.25)',
                      borderColor: theme.accent,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => onCellPress && onCellPress(r, c)}
                  activeOpacity={0.7}
                  disabled={!isValid && !isOccupied && !hammer && !isChaos}
                >
                  {/* Valid move glowing center dot */}
                  {isValid && !isOccupied && (
                    <View
                      style={[
                        styles.validMoveDot,
                        { backgroundColor: theme.accent, shadowColor: theme.accent },
                      ]}
                    />
                  )}

                  {/* Chaos Crate (+2 Barricades) */}
                  {isChaos && (
                    <View style={styles.itemCrate} pointerEvents="none">
                      <Text style={styles.crateEmoji}>📦</Text>
                      <View style={styles.crateBadge}>
                        <Text style={styles.crateBadgeText}>+2</Text>
                      </View>
                    </View>
                  )}

                  {/* Hammer Item */}
                  {hammer && (
                    <View style={styles.itemHammer} pointerEvents="none">
                      <Text style={styles.hammerEmoji}>🔨</Text>
                    </View>
                  )}

                  {/* Player Pawn Stone */}
                  {isOccupied && (
                    <View style={styles.pawnWrapper}>
                      {/* Active Turn Pulsing Orbit Ring */}
                      {isCurrentTurnToken && (
                        <View
                          style={[
                            styles.pawnOrbitRing,
                            {
                              width: cellSize * 0.88,
                              height: cellSize * 0.88,
                              borderColor: tokenColor.primary,
                            },
                          ]}
                        />
                      )}

                      {/* Pawn Body with 3D marble sheen */}
                      <View
                        style={[
                          styles.pawnBody,
                          {
                            width: cellSize * 0.72,
                            height: cellSize * 0.72,
                            borderRadius: (cellSize * 0.72) / 2,
                            backgroundColor: tokenColor.primary,
                            shadowColor: tokenColor.primary,
                          },
                        ]}
                      >
                        {/* Top-left specular sheen highlight */}
                        <View style={styles.pawnSheen} />
                        {/* Inner player identifier for 2v2 or solo */}
                        {occupantId.length > 1 && (
                          <Text style={styles.pawnLabel}>{occupantId}</Text>
                        )}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Placed Walls */}
        {renderedWalls.map(w => {
          const isTargetable = hammerModeActive && !w.isSteel;
          return (
            <TouchableOpacity
              key={w.key}
              style={[
                w.style,
                isTargetable && {
                  borderColor: '#F59E0B',
                  borderWidth: 1.8,
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 6,
                  elevation: 9,
                },
              ]}
              disabled={!hammerModeActive}
              onPress={() => hammerModeActive && onCellPress && onCellPress('break_wall', w.key)}
              activeOpacity={0.7}
            >
              {w.isSteel && (
                <View style={styles.steelRivets}>
                  <View style={styles.rivet} />
                  <View style={styles.rivet} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Ghost Preview Wall */}
        {ghostWall && <View style={ghostWall.style} pointerEvents="none" />}

        {/* Animated Shattering Wall Collapse in Pieces */}
        {breakingWall && (
          <ShatteringWall
            wallKey={breakingWall.key}
            cellSize={cellSize}
            wallThickness={wallThickness}
            color={breakingWall.color || '#94A3B8'}
            onComplete={onShatterComplete}
          />
        )}

        {/* Invisible Touch Hit-boxes for Wall Intersections during placement mode */}
        {wallPlacementMode &&
          Array.from({ length: rows - 1 }).map((_, r) => (
            <View key={`hit-row-${r}`} style={styles.intersectionRow}>
              {Array.from({ length: cols - 1 }).map((_, c) => (
                <TouchableOpacity
                  key={`int-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: (c + 1) * cellSize - cellSize * 0.4,
                    top: (r + 1) * cellSize - cellSize * 0.4,
                    width: cellSize * 0.8,
                    height: cellSize * 0.8,
                    zIndex: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() =>
                    onGridIntersectionPress &&
                    onGridIntersectionPress(r, c, wallPlacementMode)
                  }
                  activeOpacity={0.6}
                >
                  <View style={styles.intersectionDot} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validMoveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  pawnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pawnOrbitRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.8,
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  pawnBody: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  pawnSheen: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: '45%',
    height: '35%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  pawnLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  itemCrate: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  crateEmoji: {
    fontSize: 18,
  },
  crateBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#8B5CF6',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  crateBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: '#FFF',
  },
  itemHammer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hammerEmoji: {
    fontSize: 20,
    textShadowColor: '#F59E0B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  steelRivets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    alignItems: 'center',
    height: '100%',
  },
  rivet: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#EF4444',
  },
  intersectionRow: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  intersectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
  },
});
