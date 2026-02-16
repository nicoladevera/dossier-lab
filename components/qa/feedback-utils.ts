export type MessageFeedback = "GOOD" | "BAD" | null;

export function nextFeedback(current: MessageFeedback, selected: "GOOD" | "BAD"): MessageFeedback {
  return current === selected ? null : selected;
}
