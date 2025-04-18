import type { IEnvironment, RequestParameters, Variables } from "relay-runtime";
import { Environment, Network, RecordSource, Store } from "relay-runtime";

const fetchFn = async (params: RequestParameters, variables: Variables) => {
	"use server";

	const response = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"User-Agent": "solid-start",
			Accept: "application/json",
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
		},
		body: JSON.stringify({ query: params.text, variables }),
	});

	return await response.json();
};

export function createEnvironment(): IEnvironment {
	const network = Network.create((params, variables) => {
		return fetchFn(params, variables);
	});
	const store = new Store(new RecordSource());
	return new Environment({ store, network });
}
