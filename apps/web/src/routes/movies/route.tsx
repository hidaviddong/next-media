import { createFileRoute } from "@tanstack/react-router";
import LayoutComponent from "../route";

export const Route = createFileRoute("/movies")({
	component: LayoutComponent,
});
