(function initTagGroupI18n(root) {
    const STORAGE_PREFIX = 'tagGroupI18n_';

    const TAG_GROUP_DEFAULT_NAMES = {
        beans:       { zh: '咖啡豆', en: 'Coffee Beans' },
        temperature: { zh: '温度',   en: 'Temperature' },
        strength:    { zh: '浓度',   en: 'Strength' },
        syrup:       { zh: '糖浆',   en: 'Syrup' },
        sweetness:   { zh: '甜度',   en: 'Sweetness' },
        cupsize:     { zh: '杯型',   en: 'Cup Size' },
        lid:         { zh: '杯盖',   en: 'Lid' },
        latteArt:    { zh: '拉花',   en: 'Latte Art' }
    };

    const SPEC_KEYS = Object.keys(TAG_GROUP_DEFAULT_NAMES);

    function normalizeString(value) {
        return String(value == null ? '' : value).trim();
    }

    function getStorageKey(deviceId) {
        const normalized = normalizeString(deviceId);
        return normalized ? `${STORAGE_PREFIX}${normalized}` : '';
    }

    function normalize(data) {
        const out = {};
        if (!data || typeof data !== 'object') return out;
        Object.entries(data).forEach(([specKey, langMap]) => {
            const key = normalizeString(specKey);
            if (!key || !langMap || typeof langMap !== 'object') return;
            const cleaned = {};
            Object.entries(langMap).forEach(([lang, name]) => {
                const normalizedLang = normalizeString(lang);
                const normalizedName = normalizeString(name);
                if (normalizedLang && normalizedName) {
                    cleaned[normalizedLang] = normalizedName;
                }
            });
            if (Object.keys(cleaned).length) {
                out[key] = cleaned;
            }
        });
        return out;
    }

    function getStorage() {
        try {
            if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
        } catch (e) {}
        return null;
    }

    function readStored(deviceId) {
        const key = getStorageKey(deviceId);
        const storage = getStorage();
        if (!key || !storage) return {};
        try {
            const raw = storage.getItem(key);
            if (!raw) return {};
            return normalize(JSON.parse(raw));
        } catch (e) {
            return {};
        }
    }

    function writeStored(deviceId, data) {
        const key = getStorageKey(deviceId);
        const storage = getStorage();
        if (!key || !storage) return false;
        const normalized = normalize(data);
        try {
            storage.setItem(key, JSON.stringify(normalized));
            return true;
        } catch (e) {
            return false;
        }
    }

    function getGroupLabel(deviceId, specKey, lang) {
        const normalizedSpec = normalizeString(specKey);
        const normalizedLang = normalizeString(lang);
        if (!normalizedSpec) return '';
        const stored = readStored(deviceId);
        const storedGroup = stored[normalizedSpec] || {};
        const defaults = TAG_GROUP_DEFAULT_NAMES[normalizedSpec] || {};
        if (normalizedLang && storedGroup[normalizedLang]) return storedGroup[normalizedLang];
        if (normalizedLang && defaults[normalizedLang]) return defaults[normalizedLang];
        if (storedGroup.zh) return storedGroup.zh;
        if (defaults.zh) return defaults.zh;
        const fallbackLangs = Object.keys(storedGroup);
        if (fallbackLangs.length) return storedGroup[fallbackLangs[0]];
        return normalizedSpec;
    }

    function getGroupLabels(deviceId, specKey) {
        const normalizedSpec = normalizeString(specKey);
        if (!normalizedSpec) return {};
        const stored = readStored(deviceId);
        const defaults = TAG_GROUP_DEFAULT_NAMES[normalizedSpec] || {};
        return { ...defaults, ...(stored[normalizedSpec] || {}) };
    }

    function clear(deviceId) {
        const key = getStorageKey(deviceId);
        const storage = getStorage();
        if (!key || !storage) return false;
        try {
            storage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    const api = {
        STORAGE_PREFIX,
        TAG_GROUP_DEFAULT_NAMES,
        SPEC_KEYS,
        getStorageKey,
        normalize,
        readStored,
        writeStored,
        getGroupLabel,
        getGroupLabels,
        clear
    };

    if (root && typeof root === 'object') {
        root.TagGroupI18n = api;
    }
    if (typeof globalThis !== 'undefined' && globalThis && typeof globalThis === 'object') {
        globalThis.TagGroupI18n = api;
    }
    if (typeof window !== 'undefined' && window && typeof window === 'object') {
        window.TagGroupI18n = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
