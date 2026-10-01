"use client";

/** The one interactive bit of the printable-board page. */
export function PrintButton() {
  return (
    <button type="button" className="btn btn-primary rounded-xl px-5 py-3 text-base font-medium sm:self-start" onClick={() => window.print()}>
      Print the board
    </button>
  );
}
