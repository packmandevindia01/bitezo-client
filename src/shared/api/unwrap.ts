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

/** `response.data.data` when the body has it, otherwise the body. Does not look at isSuccess (see assertReportSuccess). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- responses of every shape
export function unwrapResponse<T>(response: any): T {
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
}

/** Transaction documents: fails on isSuccess false or status >= 400, reads every error shape the API sends. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- envelopes of every shape
export async function unwrapTransaction<T>(promise: Promise<{ data: any }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (envelope && (envelope.isSuccess === false || (envelope.status && envelope.status >= 400))) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.message || firstError.code) : firstError) 
                  ?? envelope.message 
                  ?? "Operation failed";
      throw new Error(msg);
    }
    return envelope?.data !== undefined ? envelope.data : envelope;
  } catch (error: any) {
    const responseData = error.response?.data;
    if (responseData) {
      const envelope = responseData;
      if (envelope.errors && typeof envelope.errors === 'object') {
        if (!Array.isArray(envelope.errors)) {
          const firstKey = Object.keys(envelope.errors)[0];
          const firstErr = envelope.errors[firstKey];
          const msg = Array.isArray(firstErr) ? firstErr[0] : firstErr;
          throw new Error(`${firstKey}: ${msg}`);
        } else if (envelope.errors.length > 0) {
          const firstErr = envelope.errors[0];
          const msg = typeof firstErr === 'object' ? (firstErr.message || firstErr.code) : firstErr;
          throw new Error(msg || envelope.message || "An unexpected error occurred.");
        }
      }
      throw new Error(envelope.message || envelope.title || "Request failed");
    }
    throw error;
  }
}

/** Fails on isSuccess false with the envelope's message. */
export async function unwrapMessage<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg = envelope.message ?? "An unexpected error occurred.";
    throw new Error(msg);
  }

  return envelope.data;
}

/** Fails with the first error's message (or field), also for HTTP errors. */
export async function unwrapMaster<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (!envelope.isSuccess) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.message || firstError.field) : firstError) 
                  ?? envelope.message 
                  ?? "An error occurred";
      throw new Error(msg);
    }
    return envelope.data;
  } catch (error: any) {
    if (error.response?.data) {
      const envelope = error.response.data as Envelope<unknown>;
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.message || firstError.field) : firstError) 
                  ?? envelope.message 
                  ?? error.message;
      throw new Error(msg);
    }
    throw error;
  }
}

/** Fails with the first error's message; the Error carries `code` and `apiStatus`. */
export async function unwrapCoded<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg =
      envelope.errors?.[0]?.message ?? envelope.message ?? "An unexpected error occurred.";
    const err = new Error(msg) as Error & { code?: string; apiStatus?: number };
    err.code = envelope.errors?.[0]?.code;
    err.apiStatus = envelope.status;
    throw err;
  }

  return envelope.data;
}

/** Like unwrapMaster, but the first error's field wins over its message. */
export async function unwrapReport<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (!envelope.isSuccess) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.field || firstError.message) : firstError) 
                  ?? envelope.message 
                  ?? "An unexpected error occurred.";
      throw new Error(msg);
    }
    return envelope.data;
  } catch (error: any) {
    if (error.response?.data) {
      const envelope = error.response.data as Envelope<unknown>;
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.field || firstError.message) : firstError) 
                  ?? envelope.message 
                  ?? error.message;
      throw new Error(msg);
    }
    throw error;
  }
}

/** What the wrappers above read from an API envelope. */
interface Envelope<T> {
  data: T;
  isSuccess?: boolean;
  message?: string;
  status?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the API sends strings or objects here
  errors?: any[];
}
