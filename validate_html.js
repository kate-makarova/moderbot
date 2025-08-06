function validate() {
    const input = document.getElementById('htmlInput').value;
    const result = document.getElementById('result');
    result.innerHTML = ''; // clear previous

    const original = input;
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(original, 'text/html');

    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(parsedDoc.body);

    // Heuristic: check if serialized DOM differs from original input
    const cleanedOriginal = original
        .replace(/\s+/g, ' ')
        .replace(/> </g, '><')
        .trim();

    const cleanedParsed = serialized
        .replace(/\s+/g, ' ')
        .replace(/> </g, '><')
        .trim();

    const errors = [];

    if (cleanedOriginal.length === 0) {
        errors.push("Input is empty.");
    } else if (cleanedOriginal !== cleanedParsed) {
        errors.push("HTML structure was modified after parsing. This may indicate missing or misnested closing tags.");
    }

    // Optional: check specific tags (e.g., common unclosed ones)
    const requiredClosures = ["div", "p", "a", "span", "li", "ul", "ol", "table", "tr", "td"];
    const openCounts = {};
    const closeCounts = {};

    const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
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
        const ul = document.createElement('ul');
        ul.className = 'errors';
        errors.forEach(err => {
            const li = document.createElement('li');
            li.textContent = err;
            ul.appendChild(li);
        });
        result.appendChild(ul);
    } else {
        const p = document.createElement('p');
        p.className = 'success';
        p.textContent = '✅ No structural issues detected.';
        result.appendChild(p);
    }
}