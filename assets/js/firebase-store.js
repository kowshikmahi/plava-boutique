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
  const auth = firebase.auth();
  const docRef = db.doc(options.siteDocPath || "sites/plava");
  const localStore = window.PlavaStore;

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
    await docRef.set(JSON.parse(JSON.stringify(data)));
    localStorage.setItem(localStore.key, JSON.stringify(data));
  }

  window.PlavaFirebase = {
    enabled: true,
    auth,
    db,
    adminEmail: options.adminEmail,
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
        throw error;
      }
    },
    async reset() {
      const defaults = window.PlavaData.merge();
      await saveRemoteData(defaults);
    }
  };
})();
