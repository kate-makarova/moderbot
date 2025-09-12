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
        const postData = await fetch('/api.php?topic+id='+this.topicId).then(response => response.json());
        this.currentPostId = postData.id;
        this.currentPostNumber = postData.number;
        this.data = postData.message;
    }

    delay(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    async waitForNewPost(oldPostId, timeout = 5000) {
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
        frame.onload = () => {
            frame.contentWindow.document.getElementById('main-reply').value = data;
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

    getPostNumber() {
        return this.currentPostNumber;
    }

    getPostId() {
        return this.currentPostId;
    }

    getData() {
        return {
            postId: this.getPostId(),
            postNumber: this.getPostNumber(),
            data: this.getData()
        }
    }
}
