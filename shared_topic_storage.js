/**
 * This class allows using a forum topic as a shared storage for any information you need.
 * Every post serves as a revision of the data, the last post being the current version.
 * Everyone who has the right to edit the topic can edit the data.
 */
class SharedTopicStorage {
    constructor(topicId) {
        this.topicId = topicId;
        this.currentPostId = null;
        this.currentPostNumber = null;
    }

    async loadData() {
        let postData = await fetch('/api.php?method=post.get&topic_id='+this.topicId+'&sort_by=id&sort_dir=desc&limit=1').then(response => response.json());
        postData = postData.response[0];
        this.currentPostId = postData.id;
        this.currentPostNumber = postData.number;
        this.data = postData.message;
    }


    delay(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    async waitForNewPost(oldPostId, timeout = 50000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            await this.delay(500);
            await this.loadData();
            if (this.currentPostId !== oldPostId) {
                return true;
            }
        }
        throw new Error('Timeout waiting for new post');
    }

    async saveData(data) {
        const oldPostId = this.currentPostId;
        const frame = document.createElement('iframe');
        frame.src = '/viewtopic.php?id='+this.topicId;
        frame.style.display = 'none';
        // frame.style.height = '500px';
        // frame.style.width = '500px';
        frame.onload = () => {
            frame.contentWindow.document.getElementById('main-reply').value = data;
            process_form(frame.contentWindow.document.getElementById('post'));
            frame.contentWindow.document.querySelector('form#post [name=submit]').click();
        }
        document.body.appendChild(frame);

        try {
            await this.waitForNewPost(oldPostId);
        } catch (e) {
            console.warn('Post may not have been updated in time.');
        }

        document.body.removeChild(frame);
        return true;
    }

    getData() {
        return {
            postId: this.currentPostId,
            postNumber: this.currentPostNumber,
            data: this.data
        }
    }
}

sharedStorages = {}
// Listen for messages from iframe
window.addEventListener("message", function(event) {
    if (event.data.type === "load_shared_storage") {
        const topicId = event.data.payload.topicId;
        sharedStorages[topicId] = new SharedTopicStorage(topicId);
        sharedStorages[topicId].loadData().then(() => {
            let response = sharedStorages[topicId].getData();
            event.source.postMessage(
                {
                    type: "load_shared_storage_response",
                    payload: response
                }, event.origin
            );
        })
    }

    if(event.data.type === "save_shared_storage") {
        const topicId = event.data.payload.topicId;
        if (!sharedStorages[topicId]) {
            console.log('Wrong shared storage');
            return;
        }
        sharedStorages[topicId].saveData(event.data.payload.data).then(() => {
            let response = sharedStorages[topicId].getData();
            event.source.postMessage(
                {
                    type: "save_shared_storage_response",
                    payload: response
                }, event.origin
            );
        })
    }
});