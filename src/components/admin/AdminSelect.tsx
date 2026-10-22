import SelectMenu, { type SelectOption } from '../ui/SelectMenu'

type Option = SelectOption

export default function AdminSelect({
  value,
  options,
  onChange,
  className = '',
  placeholder,
  disabled,
  name,
  ariaLabel,
}: {
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  name?: string
  ariaLabel?: string
}) {
  return (
    <SelectMenu
      value={value}
      options={options}
      onChange={onChange}
      variant="admin"
      className={`w-full ${className}`.trim()}
      placeholder={placeholder}
      disabled={disabled}
      name={name}
      ariaLabel={ariaLabel}
    />
  )
}

export type { Option as AdminSelectOption }
