var episodeListSettings = {
    topic_id: 1,
    fields: [
        {name: 'topic_id', type: 'short'},
        {name: 'title', type: 'short'},
        {name: 'description', type: 'long'},
        {name: 'date', type: 'short'},
    ],
    order_field: 'date',
    categories: ['Very Long Ago', 'Not Long Ago', 'Now'],
    category_template: '<div><h5>{category}</h5>{episodes}</div>',
    episode_template: '<a href="episode.html?id={topic_id}">{title}</a> <span>{date}</span> <span>{description}</span>',
}

var episodeTree = {};

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

    getIndex() {
        if (this.index) {
            return this.index;
        } else {
            this.index = episodeTree[this.category].findIndex(episode => episode.topic_id === this.topic_id);
            return this.index;
        }
    }

    getIndexField() {
        return this[episodeListSettings.order_field];
    }
}

function renderEditEpisodeForm(episode = null) {
    let fields = episodeListSettings.fields;
    fields.push({name: 'category', type: 'select', options: episodeListSettings.categories});

    let form = document.createElement('form');
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
            default:
                break;
        }
        if (episode) {
            input.value = episode[field.name];
        }
        let label = document.createElement('label');
        label.textContent = field.name;
        label.htmlFor = field.name;
        form.appendChild(label);
        form.appendChild(input);
    }
    let submit = document.createElement('input');
    submit.type = 'submit';
    submit.onclick(() => {
        episode = new Episode(episode ? episode.topic_id : null, form.category.value, !episode);
        episode.setFields(fields);
        saveEpisode(episode);
    })
    form.appendChild(submit);

    return form;
}

function saveEpisode(episode) {
    if (episode.is_new) {
        episodeTree[episode.category].push(episode);
        episodeTree[episode.category].sort((a, b) => a.getIndexField() - b.getIndexField());
    } else {
        episodeTree[episode.category][episode.getIndex()] = episode;
    }
    renderEpisodeList();
}



async function loadEpisodes() {
    episodeTree = await fetch('').then(response => response.json());
}

function renderEpisodeList() {
    let episodeListHTML = '';
    for (let category in episodeListSettings) {
        let episodes = episodeTree[category];
        let episodeHTML = '';
        for (const episode of episodes) {
            for (const field of episodeListSettings.fields) {
                episodeHTML += episodeListSettings.episode_template.replace('{'+field.name+'}', episode[field.name]);
            }
        }
        let categoryHTML = episodeListSettings.category_template.replace('{category}', category);
        categoryHTML = categoryHTML.replace('{episodes}', episodeHTML);
        episodeListHTML += categoryHTML;
    }
    document.getElementById('episode_list').innerHTML = episodeListHTML;
}
