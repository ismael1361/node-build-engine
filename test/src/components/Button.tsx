import React from "react";

const Button: React.FC<{
	onClick?: () => void;
}> = (props) => {
	return <button {...props}>Click me</button>;
};

export default Button;
