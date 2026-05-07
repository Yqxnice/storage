import React from 'react';
import { BOX_COLOR_PRESETS } from '../types/storage';

interface ColorPickerProps {
  selectedColor?: string;
  onColorSelect: (color: string) => void;
  onClear?: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  onClear,
}) => {
  return (
    <div className="color-picker">
      <div className="color-picker-grid">
        {BOX_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            className={`color-dot ${selectedColor === color ? 'selected' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect(color)}
            aria-label={`选择颜色 ${color}`}
          />
        ))}
      </div>
      {onClear && (
        <button
          className="color-clear-btn"
          onClick={onClear}
        >
          清除颜色
        </button>
      )}
    </div>
  );
};

export default ColorPicker;
