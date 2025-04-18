import { graphql } from "relay-runtime";
import { createEffect, Suspense } from "solid-js";
import {
	createPaginationFragment,
	createPreloadedQuery,
	loadQuery,
	type PreloadedQuery,
	RelayEnvironmentProvider,
} from "solid-relay";
import { createGrid } from "~/lib/grid";
import { createEnvironment } from "~/RelayEnvironment";
import type { appQuery } from "./__generated__/appQuery.graphql";
import type { appViewerFragment$key } from "./__generated__/appViewerFragment.graphql";

const AppQuery = graphql`
	query appQuery {
		viewer {
			...appViewerFragment
		}
	}
`;

function Page(props: { $query: PreloadedQuery<appQuery> }) {
	const query = createPreloadedQuery(AppQuery, () => props.$query);
	const viewer = createPaginationFragment(
		graphql`
		fragment appViewerFragment on User
		@refetchable(queryName: "ViewerRepositoriesPaginationQuery")
		@argumentDefinitions(
	  	count: { type: "Int", defaultValue: 50 },
			cursor: { type: "String" },
		) {
			repositories(first: $count, after: $cursor, orderBy: { field: STARGAZERS, direction: DESC }, ownerAffiliations: [OWNER])
			@connection(key: "ViewerConnection__repositories") {
				edges {
					cursor
					node {
						name
						stargazerCount
						createdAt
						updatedAt
						isFork
					}
				}
				totalCount
			}
		}
	`,
		() => query.latest?.viewer as appViewerFragment$key,
	);
	const grid = (<div style={{ height: "100%" }} />) as HTMLDivElement;

	createEffect(() => {
		if (!viewer.latest) return;

		createGrid<
			NonNullable<NonNullable<typeof viewer.latest.repositories.edges>[number]>
		>(grid, {
			columnDefs: [
				{ field: "node.name", headerName: "Name" },
				{ field: "node.isFork", headerName: "Fork?", cellDataType: "boolean" },
				{ field: "node.stargazerCount", headerName: "Stars" },
				{
					field: "node.createdAt",
					headerName: "Created",
					valueFormatter: (params) => new Date(params.value).toLocaleString(),
				},
				{
					field: "node.updatedAt",
					headerName: "Updated",
					valueFormatter: (params) => new Date(params.value).toLocaleString(),
				},
			],
			defaultColDef: {
				flex: 1,
			},
			autoSizeStrategy: {
				type: "fitCellContents",
				colIds: ["node.isFork", "node.stargazerCount"],
			},
			getRowId: ({ data }) => data.cursor,
			rowModelType: "infinite",
			cacheBlockSize: 50,
			datasource: {
				rowCount: viewer.latest?.repositories.totalCount,
				getRows(params) {
					const count = params.endRow - params.startRow;
					const existingRows = viewer.latest?.repositories.edges?.length ?? 0;
					if (params.endRow <= existingRows) {
						return params.successCallback(
							viewer.latest?.repositories.edges?.slice(
								params.startRow,
								params.endRow,
							) ?? [],
						);
					} else if (params.startRow > existingRows) {
						return params.failCallback();
					}
					viewer.loadNext(count, {
						onComplete(error) {
							const block = viewer.latest?.repositories.edges?.slice(
								params.startRow,
								params.endRow,
							);
							if (error || !block) return params.failCallback();
							params.successCallback(block);
						},
					});
				},
			},
		});
	});

	return <main style={{ padding: "12px", height: "100vh" }}>{grid}</main>;
}

export default function App() {
	const environment = createEnvironment();
	const $query = loadQuery<appQuery>(environment, AppQuery, {});

	return (
		<RelayEnvironmentProvider environment={environment}>
			<Suspense>
				<Page $query={$query} />
			</Suspense>
		</RelayEnvironmentProvider>
	);
}
