(function () {
  const config = window.PLAVA_FIREBASE_CONFIG || {};
  const options = window.PLAVA_FIREBASE_OPTIONS || {};
  const configured = Boolean(
    window.firebase &&
    config.apiKey &&
    !String(config.apiKey).startsWith("PASTE_") &&
    config.projectId &&
    !String(config.projectId).startsWith("PASTE_")
  );

  if (!configured) {
    window.PlavaFirebase = { enabled: false };
    return;
  }

  firebase.initializeApp(config);
  const db = firebase.firestore();
  try {
    db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });
  } catch (error) {
    console.warn("Firestore transport settings were already applied.", error);
  }
  const auth = firebase.auth();
  const docRef = db.doc(options.siteDocPath || "sites/plava");
  const localStore = window.PlavaStore;

  function getFriendlyError(error) {
    const message = error && error.message ? error.message : "";
    if (message.includes("ERR_BLOCKED_BY_CLIENT") || message.includes("blocked")) {
      return "Firestore was blocked by the browser or an extension. Allow firestore.googleapis.com or test in a clean browser profile.";
    }
    return message || "Firebase request failed.";
  }

  async function loadRemoteData() {
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      const defaults = window.PlavaData.merge();
      await docRef.set(defaults);
      return defaults;
    }
    return window.PlavaData.merge(snapshot.data());
  }

  async function saveRemoteData(data) {
    await docRef.set(JSON.parse(JSON.stringify(data)), { merge: true });
    localStorage.setItem(localStore.key, JSON.stringify(data));
  }

  window.PlavaFirebase = {
    enabled: true,
    auth,
    db,
    adminEmail: options.adminEmail,
    getFriendlyError,
    signIn(email, password) {
      return auth.signInWithEmailAndPassword(email, password);
    },
    signOut() {
      return auth.signOut();
    },
    onAuthChanged(callback) {
      return auth.onAuthStateChanged(callback);
    }
  };

  window.PlavaStore = {
    key: localStore.key,
    async load() {
      try {
        const data = await loadRemoteData();
        localStorage.setItem(this.key, JSON.stringify(data));
        return data;
      } catch (error) {
        console.warn("Firebase load failed, using local content.", error);
        return localStore.load();
      }
    },
    async save(data) {
      try {
        await saveRemoteData(data);
      } catch (error) {
        console.warn("Firebase save failed, saving locally.", error);
        await localStore.save(data);
        throw new Error(getFriendlyError(error));
      }
    },
    async reset() {
      const defaults = window.PlavaData.merge();
      await saveRemoteData(defaults);
      localStorage.setItem(this.key, JSON.stringify(defaults));
    }
  };
})();
