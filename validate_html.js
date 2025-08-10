function validate(input) {
    const original = input || '';
    const errors = [];

    // Define allowed HTML tags (add or trim as needed)
    const allowedTags = new Set([
          'link', 'section', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
       'address', 'main', 'p', 'hr', 'pre', 'blockquote', 'ol', 'ul',
        'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'div', 'a', 'em', 'strong', 'small',
        's', 'cite', 'q', 'dfn', 'abbr', 'data', 'time', 'code', 'var',
        'sub', 'sup', 'i', 'b', 'u', 'mark','span', 'br', 'img', 'video', 'audio', 'table',
        'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'form',
        'legend', 'label'
    ]);

    // Existing checks (e.g., missing quotes, tag balance)...

    // Scan all tags for validity:
    const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
    let match1;
    while ((match1 = tagRegex.exec(original))) {
        const tagName = match1[1].toLowerCase();
        if (!allowedTags.has(tagName)) {
            errors.push(`Tag ${tagName} is not a valid HTML tag.`);
        }
    }

    // --- 1. Detect unbalanced quotes in attributes (before DOMParser) ---
    const tagPattern = /<[^>]+>/g;
    let tagMatch;
    while ((tagMatch = tagPattern.exec(original))) {
        const tagText = tagMatch[0];
        const attrPattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(['"])(.*?)$/g;
        let attrMatch;
        while ((attrMatch = attrPattern.exec(tagText))) {
            const attrName = attrMatch[1];
            const quoteType = attrMatch[2];
            const afterValue = attrMatch[3];
            if (!afterValue.includes(quoteType)) {
                errors.push(`Attribute ${attrName} in tag "${tagText}" is missing closing ${quoteType}.`);
            }
        }
    }

    // If missing quotes found, skip DOMParser (to avoid swallowing the rest of the HTML)
    const hasCritical = errors.some(e => e.includes('missing closing'));
    if (!hasCritical) {
        // --- 2. Use DOMParser only if quotes are OK ---
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(original, 'text/html');
        const serializer = new XMLSerializer();
        const serialized = serializer.serializeToString(parsedDoc.body);

        const cleanedOriginal = original.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
        const cleanedParsed = serialized.replace(/\s+/g, ' ').replace(/> </g, '><').trim();

        if (cleanedOriginal.length === 0) {
            errors.push('Input is empty.');
        }
    }

    // --- 3. Manual missing/extra closing tag detection (raw text scan) ---
    const requiredClosures = ['div', 'p', 'a', 'span', 'li', 'ul', 'ol', 'table', 'tr', 'td'];
    const openCounts = {};
    const closeCounts = {};

    let match;
    while ((match = tagRegex.exec(original))) {
        const tag = match[1].toLowerCase();
        if (requiredClosures.includes(tag)) {
            if (match[0][1] === '/') {
                closeCounts[tag] = (closeCounts[tag] || 0) + 1;
            } else {
                openCounts[tag] = (openCounts[tag] || 0) + 1;
            }
        }
    }

    requiredClosures.forEach(tag => {
        const open = openCounts[tag] || 0;
        const close = closeCounts[tag] || 0;
        if (open > close) {
            errors.push(`Tag <${tag}> is missing ${open - close} closing tag(s).`);
        } else if (close > open) {
            errors.push(`Tag <${tag}> has ${close - open} extra closing tag(s).`);
        }
    });

    if (errors.length > 0) {
        return { status: 'error', errors };
    } else {
        return { status: 'valid' };
    }
}
