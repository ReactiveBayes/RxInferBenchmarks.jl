export function Footer() {
  return (
    <footer className="w-full shrink-0 border-t bg-background py-2 text-center text-xs text-muted-foreground">
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
