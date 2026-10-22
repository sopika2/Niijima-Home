/** Plain, timestamped log lines; `docker compose logs` shows them as-is. */
export function log(scope: string, message: string): void {
	console.log(`${new Date().toISOString()} [${scope}] ${message}`);
}

export function messageOf(error: unknown): string {
	if (error instanceof Error) {
		const cause = (error as { cause?: unknown }).cause;
		return cause instanceof Error && cause.message !== error.message
			? `${error.message} (${cause.message})`
			: error.message;
	}
	return String(error);
}
