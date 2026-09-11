import React, { useEffect, useState, useRef } from 'react';
import { Text } from 'react-native';

const AnimatedNumber = ({ 
  value, 
  style, 
  duration = 800,
  prefix = '₹ ',
  suffix = '.00'
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startValue = useRef(0);
  const startTime = useRef(null);
  const requestRef = useRef();

  useEffect(() => {
    // When value changes, start a new animation from current displayValue
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (time) => {
      if (!startTime.current) startTime.current = time;
      const progress = Math.min((time - startTime.current) / duration, 1);
      
      // easeOutExpo for a fast start and slow satisfying finish
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = startValue.current + (value - startValue.current) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value); // ensure it ends exactly on value
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current);
  }, [value, duration]);

  return (
    <Text style={style}>
      {prefix}{Math.round(displayValue).toLocaleString('en-IN')}{suffix}
    </Text>
  );
};

export default AnimatedNumber;
