function Dropdown({ options, value, onChange, isOpen, onToggle, label }) {
    const selectedOption = options.find(opt => opt.value === value);
    
    return (
        <div className="dropdown_wrapper">
            <button className={`dropdown_button ${isOpen ? 'open' : ''}`} onClick={onToggle}>
                {selectedOption?.icon && <span>{selectedOption.icon}</span>}
                <span>{selectedOption?.label || label}</span>
                <svg className={`dropdown_arrow ${isOpen ? 'rotated' : ''}`}>
                </svg>
            </button>
            
            {isOpen && (
                <div className="dropdown_menu">
                    {options.map(option => (
                        <button
                            key={option.value}
                            className={`dropdown_item ${value === option.value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                onToggle();
                            }}
                        >
                            {option.icon && <span>{option.icon}</span>}
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
export default Dropdown;