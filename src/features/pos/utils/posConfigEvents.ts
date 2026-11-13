/** Fired on this tab after the saved POS configuration (localStorage "posConfigs") changes. */
export const POS_CONFIG_UPDATED_EVENT = "pos_config_updated";

export const notifyPosConfigUpdated = () => {
  try {
    window.dispatchEvent(new Event(POS_CONFIG_UPDATED_EVENT));
  } catch {
    // no window (tests / SSR)
  }
};
