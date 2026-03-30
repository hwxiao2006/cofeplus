(function initBusinessTagLibrary(root) {
    function normalizeString(value) {
        return String(value || '').trim();
    }

    function normalizeStatus(status) {
        const normalized = normalizeString(status).toLowerCase();
        if (normalized === 'hidden' || normalized === 'disabled') return 'hidden';
        return 'active';
    }

    function normalizeTagNames(names) {
        return Object.entries(names && typeof names === 'object' ? names : {}).reduce((acc, [lang, label]) => {
            const normalizedLang = normalizeString(lang);
            const normalizedLabel = normalizeString(label);
            if (normalizedLang && normalizedLabel) {
                acc[normalizedLang] = normalizedLabel;
            }
            return acc;
        }, {});
    }

    function normalizeBusinessTagIds(tagIds) {
        return Array.from(new Set((Array.isArray(tagIds) ? tagIds : [])
            .map(normalizeString)
            .filter(Boolean)));
    }

    function normalizeBusinessTagEntry(tagId, tag) {
        const normalizedId = normalizeString(tagId || tag?.id);
        if (!normalizedId) return null;
        return {
            id: normalizedId,
            names: normalizeTagNames(tag && typeof tag === 'object' ? tag.names : {}),
            status: normalizeStatus(tag && typeof tag === 'object' ? tag.status : '')
        };
    }

    function normalizeBusinessTagLibrary(library) {
        return Object.entries(library && typeof library === 'object' ? library : {}).reduce((acc, [tagId, tag]) => {
            const normalized = normalizeBusinessTagEntry(tagId, tag);
            if (normalized) {
                acc[normalized.id] = normalized;
            }
            return acc;
        }, {});
    }

    function resolveTagLabel(tag, displayLang) {
        if (!tag || typeof tag !== 'object') return '';
        const names = tag.names && typeof tag.names === 'object' ? tag.names : {};
        const preferredLang = normalizeString(displayLang);
        return names[preferredLang] || names.zh || names.en || normalizeString(tag.id);
    }

    function isTagRenderable(tag) {
        return !!tag && normalizeStatus(tag.status) === 'active';
    }

    function getProductBusinessTagIds(product) {
        const explicitIds = normalizeBusinessTagIds(product && typeof product === 'object' ? product.businessTagIds : []);
        if (explicitIds.length) return explicitIds;
        return product && product.featured ? ['tag_signature'] : [];
    }

    function getRenderableProductTags(product, library) {
        const normalizedLibrary = normalizeBusinessTagLibrary(library);
        return getProductBusinessTagIds(product)
            .map(tagId => normalizedLibrary[tagId] || null)
            .filter(tag => isTagRenderable(tag));
    }

    function mergeProductTagIds(existingIds, editedVisibleIds, library) {
        const normalizedLibrary = normalizeBusinessTagLibrary(library);
        const existing = normalizeBusinessTagIds(existingIds);
        const editedVisible = normalizeBusinessTagIds(editedVisibleIds)
            .filter(tagId => isTagRenderable(normalizedLibrary[tagId]));

        const hiddenIds = existing.filter(tagId => normalizedLibrary[tagId] && !isTagRenderable(normalizedLibrary[tagId]));
        const unknownIds = existing.filter(tagId => !normalizedLibrary[tagId]);

        return [...editedVisible, ...hiddenIds, ...unknownIds];
    }

    function slugifyBusinessTagLabel(primaryLabel) {
        return normalizeString(primaryLabel)
            .toLowerCase()
            .replace(/['’]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function generateBusinessTagId(primaryLabel, library) {
        const normalizedLibrary = normalizeBusinessTagLibrary(library);
        const baseSlug = slugifyBusinessTagLabel(primaryLabel) || 'custom';
        const baseId = `tag_${baseSlug}`;
        if (!normalizedLibrary[baseId]) return baseId;

        let suffix = 2;
        while (normalizedLibrary[`${baseId}_${suffix}`]) {
            suffix += 1;
        }
        return `${baseId}_${suffix}`;
    }

    function upsertBusinessTag(existing, tagId, visibleLangPatch, status) {
        const normalizedId = normalizeString(tagId || existing?.id);
        const base = normalizeBusinessTagEntry(normalizedId, existing || { id: normalizedId }) || {
            id: normalizedId,
            names: {},
            status: 'active'
        };
        const nextNames = { ...base.names };

        Object.entries(visibleLangPatch && typeof visibleLangPatch === 'object' ? visibleLangPatch : {}).forEach(([lang, label]) => {
            const normalizedLang = normalizeString(lang);
            if (!normalizedLang) return;
            const normalizedLabel = normalizeString(label);
            if (normalizedLabel) {
                nextNames[normalizedLang] = normalizedLabel;
            } else {
                delete nextNames[normalizedLang];
            }
        });

        return {
            id: base.id,
            names: nextNames,
            status: normalizeStatus(status || base.status)
        };
    }

    function validateDeviceTagLanguageContext(deviceConfig) {
        const rawConfig = deviceConfig && typeof deviceConfig === 'object' ? deviceConfig : {};
        const hiddenLangs = new Set(normalizeBusinessTagIds(rawConfig.hiddenLangs));
        const visibleLangs = normalizeBusinessTagIds(rawConfig.langs).filter(lang => !hiddenLangs.has(lang));
        if (!visibleLangs.length) {
            return {
                ok: false,
                message: '当前设备未配置可用语言，请先启用至少一种语言'
            };
        }
        return {
            ok: true,
            value: {
                langs: visibleLangs,
                primaryLang: visibleLangs[0]
            }
        };
    }

    const api = {
        normalizeBusinessTagIds,
        normalizeBusinessTagEntry,
        normalizeBusinessTagLibrary,
        resolveTagLabel,
        isTagRenderable,
        getRenderableProductTags,
        mergeProductTagIds,
        generateBusinessTagId,
        upsertBusinessTag,
        validateDeviceTagLanguageContext
    };

    if (root && typeof root === 'object') {
        root.CofeBusinessTags = api;
    }
    if (typeof globalThis !== 'undefined' && globalThis && typeof globalThis === 'object') {
        globalThis.CofeBusinessTags = api;
    }
    if (typeof window !== 'undefined' && window && typeof window === 'object') {
        window.CofeBusinessTags = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
