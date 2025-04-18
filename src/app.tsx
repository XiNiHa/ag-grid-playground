import { graphql } from "relay-runtime";
import { createEffect, Suspense, untrack } from "solid-js";
import {
	createMutation,
	createPaginationFragment,
	createPreloadedQuery,
	loadQuery,
	type PreloadedQuery,
	RelayEnvironmentProvider,
} from "solid-relay";
import { createGrid } from "~/lib/grid";
import { createEnvironment } from "~/RelayEnvironment";
import type { appQuery } from "./__generated__/appQuery.graphql";
import type { appUpdateRepoNameMutation } from "./__generated__/appUpdateRepoNameMutation.graphql";
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
						id
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
	const [updateRepoName, isUpdatingRepoName] =
		createMutation<appUpdateRepoNameMutation>(graphql`
		mutation appUpdateRepoNameMutation($id: ID!, $newName: String!) @raw_response_type {
			updateRepository(input: { repositoryId: $id, name: $newName }) {
				repository {
					id
					name
				}
			}
		}
	`);

	type Data = NonNullable<
		NonNullable<
			NonNullable<typeof viewer.latest>["repositories"]["edges"]
		>[number]
	>;

	const gridEl = (<div style={{ height: "100%" }} />) as HTMLDivElement;

	createEffect(() => {
		if (!viewer.latest) return;

		createGrid<Data>(gridEl, {
			columnDefs: [
				{
					field: "node.name",
					headerName: "Name",
					editable: true,
					valueSetter: (params) => {
						updateRepoName({
							variables: {
								id: params.data.node!.id,
								newName: params.newValue,
							},
							optimisticResponse: {
								updateRepository: {
									repository: {
										id: params.data.node!.id,
										name: params.newValue,
									},
								},
							},
							onCompleted(_, payloadError) {
								if (payloadError?.length) {
									console.log(payloadError);
									params.node?.updateData({
										...params.data,
										node: {
											...params.data.node!,
											name: params.oldValue,
										},
									});
								}
							},
							onError(error) {
								console.log(error);
								params.node?.updateData({
									...params.data,
									node: {
										...params.data.node!,
										name: params.oldValue,
									},
								});
							},
						});
						return true;
					},
				},
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
			onCellEditingStarted(event) {
				if (untrack(isUpdatingRepoName)) event.api.stopEditing();
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

	return <main style={{ padding: "12px", height: "100vh" }}>{gridEl}</main>;
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
