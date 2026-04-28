(function initDeviceLatteArtLibrary(root) {
    const globalRoot = root || (typeof globalThis !== 'undefined' ? globalThis : {});

    function normalizeDisplayName(name) {
        return String(name || '')
            .trim()
            .replace(/\s+/g, ' ');
    }

    function normalizeLatteArtName(name) {
        return normalizeDisplayName(name).toLowerCase();
    }

    function createEmptyDeviceLatteArtLibrary(deviceId) {
        return {
            version: 1,
            deviceId: String(deviceId || '').trim(),
            updatedAt: '',
            items: []
        };
    }

    function buildLatteArtItemId() {
        return `art_${Math.random().toString(36).slice(2, 8)}`;
    }

    function normalizeDeviceLatteArtItem(rawItem, fallbackIndex) {
        const source = rawItem && typeof rawItem === 'object' ? rawItem : {};
        const displayName = normalizeDisplayName(source.name || source.nameKey);
        const nameKey = normalizeLatteArtName(source.nameKey || displayName);
        if (!nameKey) return null;

        return {
            id: String(source.id || `art_${fallbackIndex + 1}`).trim(),
            name: displayName || String(source.nameKey || '').trim(),
            nameKey,
            image: typeof source.image === 'string' ? source.image : '',
            sourceDeviceId: String(source.sourceDeviceId || '').trim(),
            createdAt: typeof source.createdAt === 'string' ? source.createdAt : '',
            updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
        };
    }

    function normalizeDeviceLatteArtLibrary(rawLibrary, deviceId) {
        const safe = rawLibrary && typeof rawLibrary === 'object' ? rawLibrary : {};
        const normalized = createEmptyDeviceLatteArtLibrary(deviceId || safe.deviceId);
        normalized.updatedAt = typeof safe.updatedAt === 'string' ? safe.updatedAt : '';

        const incomingItems = Array.isArray(safe.items) ? safe.items : [];
        const nextItems = [];

        incomingItems.forEach((item, index) => {
            const normalizedItem = normalizeDeviceLatteArtItem(item, index);
            if (!normalizedItem) return;
            const existingIndex = nextItems.findIndex(entry => entry.nameKey === normalizedItem.nameKey);
            if (existingIndex >= 0) {
                nextItems[existingIndex] = {
                    ...nextItems[existingIndex],
                    ...normalizedItem,
                    id: normalizedItem.id || nextItems[existingIndex].id
                };
                return;
            }
            nextItems.push(normalizedItem);
        });

        normalized.items = nextItems;
        return normalized;
    }

    function buildPersistedItem(baseItem, deviceId, nowIso) {
        const normalizedName = normalizeDisplayName(baseItem.name || baseItem.nameKey);
        const nameKey = normalizeLatteArtName(normalizedName || baseItem.nameKey);
        if (!nameKey) return null;
        return {
            id: String(baseItem.id || buildLatteArtItemId()).trim(),
            name: normalizedName || String(baseItem.nameKey || '').trim(),
            nameKey,
            image: typeof baseItem.image === 'string' ? baseItem.image : '',
            sourceDeviceId: String(baseItem.sourceDeviceId || deviceId || '').trim(),
            createdAt: typeof baseItem.createdAt === 'string' && baseItem.createdAt ? baseItem.createdAt : nowIso,
            updatedAt: typeof baseItem.updatedAt === 'string' && baseItem.updatedAt ? baseItem.updatedAt : nowIso
        };
    }

    function upsertDeviceLatteArtItem(library, draft) {
        const normalizedLibrary = normalizeDeviceLatteArtLibrary(library, library && library.deviceId);
        const nowIso = new Date().toISOString();
        const deviceId = String(draft && draft.sourceDeviceId || normalizedLibrary.deviceId || '').trim();
        const nextItem = buildPersistedItem({
            ...draft,
            sourceDeviceId: deviceId,
            updatedAt: nowIso
        }, deviceId, nowIso);

        if (!nextItem) return normalizedLibrary;

        const existingIndex = normalizedLibrary.items.findIndex(item => item.nameKey === nextItem.nameKey);
        const nextItems = normalizedLibrary.items.slice();

        if (existingIndex >= 0) {
            const previous = nextItems[existingIndex];
            nextItems[existingIndex] = {
                ...previous,
                ...nextItem,
                id: previous.id || nextItem.id,
                createdAt: previous.createdAt || nextItem.createdAt,
                updatedAt: nowIso
            };
        } else {
            nextItems.push(nextItem);
        }

        return {
            ...normalizedLibrary,
            deviceId: deviceId || normalizedLibrary.deviceId,
            updatedAt: nowIso,
            items: nextItems
        };
    }

    function deleteDeviceLatteArtItem(library, itemId) {
        const normalizedLibrary = normalizeDeviceLatteArtLibrary(library, library && library.deviceId);
        const targetId = String(itemId || '').trim();
        const nextItems = normalizedLibrary.items.filter(item => item.id !== targetId);
        return {
            ...normalizedLibrary,
            updatedAt: new Date().toISOString(),
            items: nextItems
        };
    }

    function copyLatteArtItemToLibrary(targetLibrary, sourceItem, targetDeviceId) {
        const normalizedTarget = normalizeDeviceLatteArtLibrary(targetLibrary, targetDeviceId);
        const normalizedSource = normalizeDeviceLatteArtItem(sourceItem, normalizedTarget.items.length);
        if (!normalizedSource) {
            return {
                library: normalizedTarget,
                action: 'skipped'
            };
        }

        const nowIso = new Date().toISOString();
        const existingIndex = normalizedTarget.items.findIndex(item => item.nameKey === normalizedSource.nameKey);
        const nextItems = normalizedTarget.items.slice();
        let action = 'added';

        if (existingIndex >= 0) {
            const previous = nextItems[existingIndex];
            nextItems[existingIndex] = {
                ...previous,
                ...normalizedSource,
                id: previous.id || normalizedSource.id,
                createdAt: previous.createdAt || normalizedSource.createdAt || nowIso,
                updatedAt: nowIso
            };
            action = 'overwritten';
        } else {
            nextItems.push({
                ...normalizedSource,
                id: normalizedSource.id || buildLatteArtItemId(),
                createdAt: normalizedSource.createdAt || nowIso,
                updatedAt: nowIso
            });
        }

        return {
            library: {
                ...normalizedTarget,
                deviceId: String(targetDeviceId || normalizedTarget.deviceId || '').trim(),
                updatedAt: nowIso,
                items: nextItems
            },
            action
        };
    }

    function normalizeProductNameList(productNames) {
        return Array.from(new Set((Array.isArray(productNames) ? productNames : [])
            .map(normalizeLatteArtName)
            .filter(Boolean)));
    }

    function buildLatteArtLinkageSummary(options) {
        const productNames = normalizeProductNameList(options && options.productNames);
        const library = normalizeDeviceLatteArtLibrary(options && options.library, options && options.library && options.library.deviceId);
        const libraryNameKeys = library.items.map(item => item.nameKey);

        const linkedNameKeys = productNames.filter(nameKey => libraryNameKeys.includes(nameKey));
        const missingNameKeys = productNames.filter(nameKey => !libraryNameKeys.includes(nameKey));
        const unreferencedNameKeys = libraryNameKeys.filter(nameKey => !productNames.includes(nameKey));

        return {
            uploadedCount: library.items.length,
            linkedCount: linkedNameKeys.length,
            unreferencedCount: unreferencedNameKeys.length,
            missingMaterialCount: missingNameKeys.length,
            linkedNameKeys,
            unreferencedNameKeys,
            missingNameKeys
        };
    }

    function collectOptionNames(value, bucket) {
        if (Array.isArray(value)) {
            value.forEach(item => collectOptionNames(item, bucket));
            return;
        }
        if (!value) return;
        if (typeof value === 'string') {
            const normalized = normalizeLatteArtName(value);
            if (normalized && normalized !== '无') bucket.add(normalized);
            return;
        }
        if (typeof value === 'object') {
            const label = value.label || value.value || value.name || value.zh || value.en;
            if (label) {
                const normalized = normalizeLatteArtName(label);
                if (normalized && normalized !== '无') bucket.add(normalized);
            }
        }
    }

    function collectNormalizedProductLatteArtNames(productsData) {
        const names = new Set();
        Object.values(productsData || {}).forEach(category => {
            (category && Array.isArray(category.items) ? category.items : []).forEach(product => {
                if (!product || typeof product !== 'object') return;
                collectOptionNames(product.options && product.options.latteArt, names);
                collectOptionNames(product.specs && product.specs.latteArt, names);
                collectOptionNames(product.defaultOptions && product.defaultOptions.latteArt, names);
            });
        });
        return Array.from(names);
    }

    const api = {
        normalizeLatteArtName,
        normalizeDeviceLatteArtLibrary,
        createEmptyDeviceLatteArtLibrary,
        upsertDeviceLatteArtItem,
        deleteDeviceLatteArtItem,
        copyLatteArtItemToLibrary,
        buildLatteArtLinkageSummary,
        collectNormalizedProductLatteArtNames
    };

    globalRoot.CofeDeviceLatteArtLibrary = api;
    if (typeof globalThis !== 'undefined') {
        globalThis.CofeDeviceLatteArtLibrary = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));
