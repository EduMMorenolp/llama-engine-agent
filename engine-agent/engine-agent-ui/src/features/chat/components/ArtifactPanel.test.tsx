import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtifactPanel, type ArtifactData } from "./ArtifactPanel.tsx";

describe("ArtifactPanel", () => {
	it("renders code artifact with title and code content", () => {
		const artifact: ArtifactData = {
			title: "Script Python",
			language: "python",
			content: 'print("Hola mundo")',
			type: "code",
		};
		const onClose = vi.fn();
		const { container } = render(<ArtifactPanel artifact={artifact} onClose={onClose} />);

		expect(screen.getByText("Script Python")).toBeDefined();
		expect(screen.getByText("python")).toBeDefined();
		expect(container.textContent).toContain('print("Hola mundo")');
	});

	it("calls onClose when close button is clicked", () => {
		const artifact: ArtifactData = {
			title: "HTML Preview",
			language: "html",
			content: "<h1>Título</h1>",
			type: "html",
		};
		const onClose = vi.fn();
		render(<ArtifactPanel artifact={artifact} onClose={onClose} />);

		const closeBtn = screen.getByTitle("Cerrar canvas");
		fireEvent.click(closeBtn);
		expect(onClose).toHaveBeenCalled();
	});

	it("renders preview and code tabs for HTML artifacts", () => {
		const artifact: ArtifactData = {
			title: "Página web",
			language: "html",
			content: "<p>Hola</p>",
			type: "html",
		};
		render(<ArtifactPanel artifact={artifact} onClose={vi.fn()} />);

		expect(screen.getByText("Vista Previa")).toBeDefined();
		expect(screen.getByText("Código")).toBeDefined();
	});
});
