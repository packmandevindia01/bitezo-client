/**
 * Response unwrappers — ONE place for the backend response shapes (Phase 0).
 * The same behaviours were copy-pasted in 8 services; each variant below behaves like the copies it
 * replaces for every valid response (unwrapData no longer crashes on a non-object body).
 *
 *   unwrapBody      → the raw response body                        (res.data)
 *   unwrapData      → body.data when the body is an envelope, else the body; never throws
 *   unwrapEnvelope  → like unwrapData, but throws when body.isSuccess === false
 *   unwrapStrict    → body.data; throws unless body.isSuccess is truthy
 */

export interface ApiEnvelope<T = unknown> {
  isSuccess?: boolean;
  message?: string | null;
  statusCode?: number | null;
  data?: T;
}

type ResponseLike<B> = { data: B };

/** Raw body (`res.data`). */
export const unwrapBody = <T>(promise: Promise<ResponseLike<any>>): Promise<T> =>
  promise.then((res) => res.data as T);

/** `body.data` when the body has a `data` key, otherwise the body. Never throws. */
export const unwrapData = async <T>(promise: Promise<{ data: { data: T } | T }>): Promise<T> => {
  const response = await promise;
  if (response.data && typeof response.data === "object" && "data" in response.data) {
    return (response.data as ApiEnvelope<T>).data as T;
  }
  return response.data as T;
};

/** Envelope with soft failure: throws `message` when `isSuccess === false`; returns `data` (or the body). */
export const unwrapEnvelope = <T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> =>
  promise.then((res) => {
    if (res.data && res.data.isSuccess === false) throw new Error(res.data.message as string); // same as the old copies (null → "null")
    return (res.data?.data !== undefined ? res.data.data : res.data) as T;
  });

/** Strict envelope: throws unless `isSuccess` is truthy; returns `data`. */
export const unwrapStrict = <T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> =>
  promise.then((res) => {
    if (!res.data.isSuccess) {
      throw new Error(res.data.message || "An unexpected error occurred");
    }
    return res.data.data as T;
  });
