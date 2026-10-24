import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import './RimaqSelect.css';

export const RimaqSelect = ({
  value,
  onValueChange,
  options = [],
  placeholder,
  disabled = false,
  ariaLabel,
  className = '',
  style = {}
}) => (
  <Select.Root value={value ? String(value) : undefined} onValueChange={onValueChange} disabled={disabled}>
    <Select.Trigger className={`rq-select__trigger ${className}`} style={style} aria-label={ariaLabel}>
      <Select.Value placeholder={placeholder} />
      <Select.Icon className="rq-select__chevron"><ChevronDown size={16} /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="rq-select__content" position="popper" sideOffset={6} collisionPadding={12}>
        <Select.Viewport className="rq-select__viewport">
          {options.map((option) => (
            <Select.Item className="rq-select__item" key={String(option.value)} value={String(option.value)}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator className="rq-select__indicator"><Check size={15} /></Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
