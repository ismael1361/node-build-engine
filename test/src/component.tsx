import React from "react";
import { Button } from "./components";

const app = () => {
	const [state, setState] = React.useState(0);
	const divRef = React.useRef<HTMLDivElement>(null);

	return (
		<div ref={divRef}>
			<span>hello world - {state}</span>
			<Button onClick={() => setState((p) => p + 1)} />
		</div>
	);
};

export default app;
