// To be loaded in an iframe for use by Keycloak.
// See https://www.keycloak.org/securing-apps/javascript-adapter#_using_the_adapter

const SilentCheckSSO = () => {
  window.parent.postMessage(window.location.href, window.location.origin);

  return <></>;
};

export default SilentCheckSSO;
