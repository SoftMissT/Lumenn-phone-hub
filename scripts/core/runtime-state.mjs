const state = {
  unreadNotifications: 0,
  runtimeReady: false,
};

export function getUnreadNotifications() {
  return state.unreadNotifications;
}

export function setUnreadNotifications(value) {
  state.unreadNotifications = Math.max(0, Math.trunc(Number(value) || 0));
  return state.unreadNotifications;
}

export function incrementUnreadNotifications(delta = 1) {
  return setUnreadNotifications(
    state.unreadNotifications + (Number(delta) || 0),
  );
}

export function isRuntimeReady() {
  return state.runtimeReady;
}

export function markRuntimeReady() {
  state.runtimeReady = true;
  return true;
}
