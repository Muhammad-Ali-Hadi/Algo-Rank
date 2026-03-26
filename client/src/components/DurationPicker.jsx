import { useState, useEffect } from 'react';

export default function DurationPicker({ valueSeconds, onChange, required = false }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Initialize from valueSeconds
  useEffect(() => {
    if (valueSeconds) {
      setHours(Math.floor(valueSeconds / 3600));
      setMinutes(Math.floor((valueSeconds % 3600) / 60));
      setSeconds(valueSeconds % 60);
    } else {
      setHours(0);
      setMinutes(0);
      setSeconds(0);
    }
  }, [valueSeconds]);

  const handleChange = (type, val) => {
    let num = parseInt(val) || 0;
    
    // Bounds checking
    if (type === 'h') num = Math.max(0, Math.min(999, num));
    if (type === 'm' || type === 's') num = Math.max(0, Math.min(59, num));

    let h = type === 'h' ? num : hours;
    let m = type === 'm' ? num : minutes;
    let s = type === 's' ? num : seconds;

    if (type === 'h') setHours(num);
    if (type === 'm') setMinutes(num);
    if (type === 's') setSeconds(num);

    const totalSeconds = (h * 3600) + (m * 60) + s;
    onChange(totalSeconds);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label className="text-xs text-muted mb-1 block">Hours</label>
        <input
          type="number"
          min="0"
          className="neon-input text-center px-2 py-2"
          value={hours.toString().padStart(2, '0')}
          onChange={(e) => handleChange('h', e.target.value)}
          required={required}
        />
      </div>
      <span className="text-muted font-bold mt-5">:</span>
      <div className="flex-1">
        <label className="text-xs text-muted mb-1 block">Minutes</label>
        <input
          type="number"
          min="0"
          max="59"
          className="neon-input text-center px-2 py-2"
          value={minutes.toString().padStart(2, '0')}
          onChange={(e) => handleChange('m', e.target.value)}
          required={required}
        />
      </div>
      <span className="text-muted font-bold mt-5">:</span>
      <div className="flex-1">
        <label className="text-xs text-muted mb-1 block">Seconds</label>
        <input
          type="number"
          min="0"
          max="59"
          className="neon-input text-center px-2 py-2"
          value={seconds.toString().padStart(2, '0')}
          onChange={(e) => handleChange('s', e.target.value)}
          required={required}
        />
      </div>
    </div>
  );
}
