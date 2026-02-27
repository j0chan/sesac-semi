export function toErrorMessage(error: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}
