class EpisodeList {
    constructor(settings) {
        this.settings = settings;
        this.episodeTree = {};
        this.storageClient = this.initializeStorageClient(settings.storage);
    }

    initializeStorageClient(storage) {
        switch (storage.type) {
            case 'topic_shared':
                return new SharedTopicStorageClient(storage.topic_id);
            case 'rest':
                return new RESTStorageClient(storage.url);
            default:
                throw new Error(`Unsupported storage type: ${storage.type}`);
        }
    }

    async loadEpisodes() {
        await this.storageClient.loadData();
        this.episodeTree = JSON.parse(this.storageClient.getData());
        this.renderEpisodeList();
    }

    async saveEpisode(episode) {
        if (episode.is_new) {
            this.episodeTree[episode.category].push(episode);
            this.episodeTree[episode.category].sort(
                (a, b) => a.getIndexField(this.settings.order_field) - b.getIndexField(this.settings.order_field)
            );
        } else {
            this.episodeTree[episode.category][episode.getIndex(this.episodeTree)] = episode;
        }

        await this.storageClient.saveData(JSON.stringify(this.episodeTree));
        this.renderEpisodeList();
    }

    editEpisode(category, topic_id) {
        let episode = this.episodeTree[category].find(ep => ep.topic_id === topic_id);
        if (!episode) {
            episode = new Episode(null, category, true);
        }
        const form = this.renderEditEpisodeForm(episode);

        // Remove existing modal if any
        const oldModal = document.getElementById('episode_modal');
        if (oldModal) oldModal.remove();

        // Create modal elements
        const modal = document.createElement('div');
        modal.id = 'episode_modal';
        modal.className = 'modal';
        modal.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
        background: #fff;
        padding: 20px;
        max-width: 600px;
        width: 90%;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
    `;

        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalFooter.style.cssText = `
        margin-top: 10px;
        text-align: right;
    `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => modal.remove();

        modalFooter.appendChild(closeBtn);
        modalContent.appendChild(form);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);

        // Close modal on outside click
        modal.onclick = (event) => {
            if (event.target === modal) modal.remove();
        };

        // Append modal to body
        document.body.appendChild(modal);
    }

    renderEditEpisodeForm(episode = null) {
        let fields = [...this.settings.fields];
        fields.push({
            name: 'category',
            type: 'select',
            options: this.settings.categories
        });

        let form = document.createElement('div');
        for (const field of fields) {
            let input = null;
            switch (field.type) {
                case 'select':
                    input = document.createElement('select');
                    input.name = field.name;
                    input.innerHTML = '<option value="">Select...</option>';
                    for (const option of field.options) {
                        input.innerHTML += `<option value="${option}">${option}</option>`;
                    }
                    break;
                case 'short':
                    input = document.createElement('input');
                    input.type = 'text';
                    input.name = field.name;
                    break;
                case 'long':
                    input = document.createElement('textarea');
                    input.name = field.name;
                    break;
            }
            if (episode) input.value = episode[field.name];

            let label = document.createElement('label');
            label.textContent = field.name;
            label.htmlFor = field.name;
            form.appendChild(label);
            form.appendChild(input);
        }

        let submit = document.createElement('input');
        submit.type = 'submit';
        submit.onclick = async () => {
            let isNew = !episode;
            episode = new Episode(episode ? episode.topic_id : null, form.category.value, isNew);
            const values = fields.map(f => ({ name: f.name, value: form[f.name].value }));
            episode.setFields(values);
            await this.saveEpisode(episode);
        };
        form.appendChild(submit);

        return form;
    }

    renderEpisodeList() {
        let html = '';
        for (let category in this.episodeTree) {
            let episodes = this.episodeTree[category];
            let episodeHTML = '';
            for (const episode of episodes) {
                let entry = this.settings.episode_template;
                for (const field of this.settings.fields) {
                    entry = entry.replace(`{${field.name}}`, episode[field.name]);
                }
                const button = this.settings.button_template.replace('onclick', `onclick="episodeList.editEpisode('${category}', ${episode.topic_id})"`);
                entry = entry.replace('{button}', button);
                episodeHTML += entry;
            }
            let categoryHTML = this.settings.category_template
                .replace('{category}', category)
                .replace('{episodes}', episodeHTML);
            html += categoryHTML;
        }
        document.getElementById('episode_list').innerHTML = html;
    }
}

class SharedTopicStorageClient {
    constructor(topicId) {
        this.topicId = topicId;
        this.data = '{}';
    }

    async loadData() {
        // Mock: Load from localStorage or server
        this.data = localStorage.getItem(`topic_${this.topicId}`) || '{}';
    }

    async saveData(data) {
        this.data = data;
        localStorage.setItem(`topic_${this.topicId}`, data);
    }

    getData() {
        return this.data;
    }
}

class RESTStorageClient {
    constructor(url) {
        this.url = url;
        this.data = '{}';
    }

    async loadData() {
        const response = await fetch(this.url);
        this.data = await response.text();
    }

    async saveData(data) {
        await fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
        });
    }

    getData() {
        return this.data;
    }
}

class Episode {
    constructor(topic_id, category, is_new = false) {
        this.topic_id = topic_id;
        this.category = category;
        this.is_new = is_new;
    }

    setFields(fields) {
        for (const field of fields) {
            this[field.name] = field.value;
        }
    }

    getIndex(episodeTree) {
        if (this.index != null) return this.index;
        this.index = episodeTree[this.category].findIndex(ep => ep.topic_id === this.topic_id);
        return this.index;
    }

    getIndexField(orderField) {
        return this[orderField];
    }
}

const episodeListSettings = {
    storage: {
        type: 'topic_shared',
        topic_id: 1,
    },
    fields: [
        { name: 'topic_id', type: 'short' },
        { name: 'title', type: 'short' },
        { name: 'description', type: 'long' },
        { name: 'date', type: 'short' },
    ],
    order_field: 'date',
    categories: ['Very Long Ago', 'Not Long Ago', 'Now'],
    category_template: '<div><h5>{category}</h5><ul>{episodes}</ul></div>',
    button_template: '<button onclick>Edit</button>',
    episode_template: '<li>{button} <a href="/topic.html?id={topic_id}">{title}</a> <span>{date}</span> <span>{description}</span></li>',
};
