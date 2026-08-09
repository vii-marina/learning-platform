import { useState } from "react";
import { createLocalEntityId } from "../lib/courseBuilderPageUtils";
import type {
  CoursePreviewChatContext,
  CoursePreviewChatMessage,
} from "../components/CoursePreviewAskTeacherModal";

/**
 * The "ask the teacher" panel in the course preview.
 *
 * Messages are keyed by the context's `reference` (a lesson or test id) rather than kept in
 * one list, so reopening the panel on a different lesson shows that lesson's conversation
 * instead of a single global thread.
 *
 * Nothing here is sent anywhere: this is a preview, and the reply is a fixed
 * acknowledgement. Real messaging is the chat feature (F9) and would replace the body of
 * `sendMessage` without changing this shape.
 */
export function useCoursePreviewChat() {
  const [chatContext, setChatContext] = useState<CoursePreviewChatContext | null>(null);
  const [chatMessagesByReference, setChatMessagesByReference] = useState<
    Record<string, CoursePreviewChatMessage[]>
  >({});

  const chatMessages = chatContext
    ? chatMessagesByReference[chatContext.reference] ?? []
    : [];

  function openChat(context: CoursePreviewChatContext) {
    setChatContext(context);
  }

  function closeChat() {
    setChatContext(null);
  }

  /**
   * Clears the conversations as well as the open panel. Used when the preview switches to a
   * different course — carrying one course's questions into another would be wrong, and the
   * references would not match anything in the new tree anyway.
   */
  function resetChat() {
    setChatContext(null);
    setChatMessagesByReference({});
  }

  function sendMessage(message: string) {
    if (!chatContext) {
      return;
    }

    setChatMessagesByReference((currentMessages) => ({
      ...currentMessages,
      [chatContext.reference]: [
        ...(currentMessages[chatContext.reference] ?? []),
        {
          id: createLocalEntityId("teacher-message"),
          role: "user",
          text: message,
        },
        {
          id: createLocalEntityId("teacher-reply"),
          role: "assistant",
          text: "Запитання збережено з привʼязкою до поточного уроку або тесту.",
        },
      ],
    }));
  }

  return {
    chatContext,
    chatMessages,
    openChat,
    closeChat,
    resetChat,
    sendMessage,
  };
}
