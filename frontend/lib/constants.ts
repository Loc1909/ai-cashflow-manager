// Centralized keys used by the auth flow. Keeping this in one place means
// renaming the token key (or adding related ones later) only touches one file
// instead of every call site that reads/writes localStorage.
export const AUTH_TOKEN_KEY = "access_token";
