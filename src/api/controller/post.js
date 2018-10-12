const Base = require('./base.js');
const Rest = require('./rest.js');

const namespace = 'post';

const actions = Rest(namespace);

class Controller extends Base {
  async indexAction() {
    const result = await this.model(namespace).limit(100).select();
    return this.success(result);
  }
  async listAction() {
  	const { page } = this.get();
  	const thisTime = parseInt(Date.now() / 1000);
  	const currentTime = thisTime - 3600 * 24 * 30;
  	if (parseInt(page) === 1) {
	  	const topPosts = await this.model(namespace).where({ 'status': 2, is_top: 1, add_time: [ '>', currentTime ] }).order('id desc').select();
	  	const { data: mainPosts } = await this.model(namespace).where({ 'status': 2, is_top: 0 }).order('id desc').page(page, 13).countSelect();
      console.log('topPosts.length', topPosts)
      console.log('mainPosts.length', mainPosts)

	  	const allArr = [ ...topPosts, ...mainPosts ]
      
	  	return this.success(allArr);
  	} else {
  		const result = await this.model(namespace).where({ 'status': 2, is_top: 0 }).order('id desc').page(page, 13).countSelect();
  		return this.success(result.data)
  	}
  }
  async addviewAction() {
  	const { post_id } = this.get();
  	let { view } = await this.model(namespace).where({ id: post_id }).find();
  	view ++;
  	const result = await this.model(namespace).where({ id: post_id }).update({ view });

  	return this.success(result);
  }
  async upAction() {
  	const { post_id } = this.get();

  	const result = await this.model('post_up').add({
  		post_id,
  		user_id: this.ctx.state.userId,
  		add_time: parseInt(Date.now() / 1000)
  	})
    if (!think.isEmpty(result) && result > 0) {
      let { up } = await this.model(namespace).where({ id: post_id }).find();
      up ++;
      const upResult = await this.model(namespace).where({ id: post_id }).update({ up })
      return this.success(upResult);
    } else {
      return this.fail();
    }

  	return this.success(result);
  }
}
Object.assign(Controller.prototype, actions);
module.exports = Controller;