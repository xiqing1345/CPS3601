export async function withMinDelay<T>(promise: Promise<T>, minDurationMs = 550): Promise<T> {
  const start = Date.now();

  try {
    const result = await promise;
    const elapsed = Date.now() - start;
    if (elapsed < minDurationMs) {
      await new Promise((resolve) => setTimeout(resolve, minDurationMs - elapsed));
    }
    return result;
  } catch (error) {
    const elapsed = Date.now() - start;
    if (elapsed < minDurationMs) {
      await new Promise((resolve) => setTimeout(resolve, minDurationMs - elapsed));
    }
    throw error;
  }
}
