import { onMount, Suspense } from "solid-js";
import { RelayEnvironmentProvider } from "solid-relay";
import { createGrid } from "~/lib/grid";
import { createEnvironment } from "~/RelayEnvironment";

function Page() {
	const grid = (<div style={{ height: "100%" }} />) as HTMLDivElement;

	onMount(() => {
		createGrid(grid, {
			columnDefs: [
				{ field: "make" },
				{ field: "model" },
				{ field: "price" },
				{ field: "electric" },
			],
			rowData: [
				{ make: "Tesla", model: "Model Y", price: 64950, electric: true },
				{ make: "Ford", model: "F-Series", price: 33850, electric: false },
				{ make: "Toyota", model: "Corolla", price: 29600, electric: false },
			],
			defaultColDef: {
				flex: 1,
			},
		});
	});

	return (
		<main style={{ padding: "12px", height: "100vh" }}>
			{grid}
		</main>
	);
}

export default function App() {
	const environment = createEnvironment();

	return (
		<RelayEnvironmentProvider environment={environment}>
			<Suspense>
				<Page />
			</Suspense>
		</RelayEnvironmentProvider>
	);
}
