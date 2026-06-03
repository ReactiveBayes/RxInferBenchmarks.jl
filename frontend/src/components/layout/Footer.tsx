export function Footer() {
  return (
    <footer className="mt-10 border-t pt-4 pb-2 text-center text-xs text-muted-foreground">
      Created and maintained by the{" "}
      <a
        href="https://github.com/ReactiveBayes"
        target="_blank"
        rel="noreferrer"
        className="font-medium underline-offset-4 hover:text-foreground hover:underline"
      >
        ReactiveBayes team
      </a>{" "}
      · made with{" "}
      <a
        href="https://claude.com/claude-code"
        target="_blank"
        rel="noreferrer"
        className="font-medium underline-offset-4 hover:text-foreground hover:underline"
      >
        Claude
      </a>
    </footer>
  );
}
