import { useState } from "react";

function CustomSelect(
    { 
        options, 
        value, 
        onChange, 
        placeholder }
) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find(
        (option) => option.value === value
    );

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className="custom_select">

            {/* Select box */}
            <div
                className={`select_control ${isOpen ? "is_open" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? "" : "select-placeholder"}>
                    {selectedOption?.label || placeholder}
                </span>

                <span className={`select-arrow ${isOpen ? "rotate" : ""}`}>
                ▾
                </span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="select_menu">
                {options.map((option) => (
                    <div
                        key={option.value}
                        className={`select_option ${
                            option.value === value ? "selected" : ""
                        }`}
                        onClick={() => handleSelect(option)}
                    >
                    {option.label}
                    </div>
                ))}
                </div>
            )}

        </div>
  );
}

export default CustomSelect;