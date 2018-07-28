const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    const model = this.model('goods');
    const goodsList = await model.select();

    return this.success(goodsList);
  }

  /**
   * 获取sku信息，用于购物车编辑时选择规格
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async skuAction() {
    const goodsId = this.get('id');
    const model = this.model('goods');

    return this.success({
      specificationList: await model.getSpecificationList(goodsId),
      productList: await model.getProductList(goodsId)
    });
  }

  /**
   * 商品详情页数据
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async detailAction() {
    const goodsId = this.get('id');
    const model = this.model('goods');

    const info = await model.where({'id': goodsId}).find();
    const gallery = await this.model('goods_gallery').where({goods_id: goodsId}).limit(4).select();
    const attribute = await this.model('goods_attribute').field('nideshop_goods_attribute.value, nideshop_attribute.name').join('nideshop_attribute ON nideshop_goods_attribute.attribute_id=nideshop_attribute.id').order({'nideshop_goods_attribute.id': 'asc'}).where({'nideshop_goods_attribute.goods_id': goodsId}).select();
    const issue = await this.model('goods_issue').where({goods_id: goodsId}).select();
    const brand = await this.model('brand').where({id: info.brand_id}).find();
    const commentCount = await this.model('comment').where({value_id: goodsId, type_id: 0}).count();
    const hotComment = await this.model('comment').where({value_id: goodsId, type_id: 0}).order('id desc').find();
    const productList = await model.getProductList(goodsId);
    let commentInfo = {};
    let specificationIds = new Set();
    productList.forEach(product => {
      const product_specification_ids = product.goods_specification_ids.split("_");
      product_specification_ids.forEach(specification_id => {
        specificationIds.add(specification_id);
      })
    });
    console.log("商品规格ID", specificationIds);
    if (!think.isEmpty(hotComment)) {
      const commentUser = await this.model('user').field(['nickname', 'username', 'avatar']).where({id: hotComment.user_id}).find();
      commentInfo = {
        content: Buffer.from(hotComment.content, 'base64').toString(),
        add_time: think.datetime(new Date(hotComment.add_time * 1000)),
        nickname: commentUser.nickname,
        avatar: commentUser.avatar,
        pic_list: await this.model('comment_picture').where({comment_id: hotComment.id}).select()
      };
    }

    const comment = {
      count: commentCount,
      data: commentInfo
    };

    // 当前用户是否收藏
    const userHasCollect = await this.model('collect').isUserHasCollect(this.ctx.state.userId, 0, goodsId);

    // 记录用户的足迹 TODO
    await await this.model('footprint').addFootprint(this.ctx.state.userId, goodsId);

    // return this.json(jsonData);
    return this.success({
      info: info,
      gallery: gallery,
      attribute: attribute,
      userHasCollect: userHasCollect,
      issue: issue,
      comment: comment,
      brand: brand,
      productList,
      specificationList: await model.getSpecificationList([ ...specificationIds ])
    });
  }

  /**
   * 获取分类下的商品
   * @returns {Promise.<*>}
   */
  async categoryAction() {
    const { id, type: type = "1" } = this.get(); //type 为1时，拉取指定的一级分类及其顶级分类和兄弟分类， type为2时，拉取全部一级分类, type默认值为1
    const model = this.model('category');
    console.log("type", type);
    if(type === "1"){
      const currentCategory = await model.where({ id }).find();
      const parentCategory = await model.where({ id: currentCategory.parent_id }).find();
      const brotherCategory = await model.where({ parent_id: currentCategory.parent_id }).select();

      return this.success({
        currentCategory,
        parentCategory,
        brotherCategory
      });
    }else if(type === "2"){
      const currentCategory = await model.where({ id }).find();
      const firstCategoryList = await model.where({ level: "L2" }).select();
      return this.success({
        currentCategory,
        brotherCategory: firstCategoryList
      });
    }
  }

  /**
   * 获取商品列表
   * @returns {Promise.<*>}
   */
  async listAction() {
    const categoryId = this.get('categoryId');
    const brandId = this.get('brandId');
    const tagId = this.get('tagId');
    const keyword = this.get('keyword');
    const isNew = this.get('isNew');
    const isHot = this.get('isHot');
    const page = this.get('page');
    const size = this.get('size');
    const sort = this.get('sort');
    const order = this.get('order');

    const goodsQuery = this.model('goods');

    const whereMap = {};
    if (!think.isEmpty(isNew)) {
      whereMap.is_new = isNew;
    }

    if (!think.isEmpty(isHot)) {
      whereMap.is_hot = isHot;
    }

    if (!think.isEmpty(keyword)) {
      whereMap.name = ['like', `%${keyword}%`];
      // 添加到搜索历史
      await this.model('search_history').add({
        keyword: keyword,
        user_id: this.ctx.state.userId,
        add_time: parseInt(new Date().getTime() / 1000)
      });
    }

    if (!think.isEmpty(brandId)) {
      whereMap.brand_id = brandId;
    }
    if (!think.isEmpty(tagId)) {
      whereMap.tag_id = tagId;
    }

    // 只显示在售
    whereMap.is_on_sale = 1;

    // 排序
    let orderMap = {};
    if (sort === 'price') {
      // 按价格
      orderMap = {
        retail_price: order
      };
    } else {
      // 按商品添加时间
      orderMap = {
        id: 'desc'
      };
    }

    // 筛选的分类
    let filterCategory = [{
      'id': 0,
      'name': '全部',
      'checked': false
    }];

    const categoryIds = await goodsQuery.where(whereMap).getField('category_id', 10000);
    if (!think.isEmpty(categoryIds)) {
      // 查找二级分类的parent_id
      const parentIds = await this.model('category').where({id: {'in': categoryIds}}).getField('parent_id', 10000);
      // 一级分类
      const parentCategory = await this.model('category').field(['id', 'name']).order({'sort_order': 'asc'}).where({'id': {'in': parentIds}}).select();

      if (!think.isEmpty(parentCategory)) {
        filterCategory = filterCategory.concat(parentCategory);
      }
    }

    // 加入分类条件
    if (!think.isEmpty(categoryId) && parseInt(categoryId) > 0) {
      whereMap.category_id = ['in', await this.model('category').getCategoryWhereIn(categoryId)];
    }

    // 搜索到的商品
    const goodsData = await goodsQuery.where(whereMap).field(['id', 'name', 'list_pic_url', 'retail_price']).order(orderMap).page(page, size).countSelect();
    goodsData.filterCategory = filterCategory.map(function(v) {
      v.checked = (think.isEmpty(categoryId) && v.id === 0) || v.id === parseInt(categoryId);
      return v;
    });
    goodsData.goodsList = goodsData.data;

    return this.success(goodsData);
  }

  /**
   * 商品列表筛选的分类列表
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async filterAction() {
    const categoryId = this.get('categoryId');
    const keyword = this.get('keyword');
    const isNew = this.get('isNew');
    const isHot = this.get('isHot');

    const goodsQuery = this.model('goods');

    if (!think.isEmpty(categoryId)) {
      goodsQuery.where({category_id: {'in': await this.model('category').getChildCategoryId(categoryId)}});
    }

    if (!think.isEmpty(isNew)) {
      goodsQuery.where({is_new: isNew});
    }

    if (!think.isEmpty(isHot)) {
      goodsQuery.where({is_hot: isHot});
    }

    if (!think.isEmpty(keyword)) {
      goodsQuery.where({name: {'like': `%${keyword}%`}});
    }

    let filterCategory = [{
      'id': 0,
      'name': '全部'
    }];

    // 二级分类id
    const categoryIds = await goodsQuery.getField('category_id', 10000);
    if (!think.isEmpty(categoryIds)) {
      // 查找二级分类的parent_id
      const parentIds = await this.model('category').where({id: {'in': categoryIds}}).getField('parent_id', 10000);
      // 一级分类
      const parentCategory = await this.model('category').field(['id', 'name']).order({'sort_order': 'asc'}).where({'id': {'in': parentIds}}).select();

      if (!think.isEmpty(parentCategory)) {
        filterCategory = filterCategory.concat(parentCategory);
      }
    }

    return this.success(filterCategory);
  }

  /**
   * 新品首发
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async newAction() {
    const { new_goods_title, new_goods_bannar_url } = await this.model("others").limit(1).find();
    return this.success({
      bannerInfo: {
        url: new_goods_bannar_url,
        name: new_goods_title,
        img_url: new_goods_bannar_url
      }
    });
  }

  /**
   * 人气推荐
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async hotAction() {
    const { hot_goods_title, hot_goods_bannar_url } = await this.model("others").limit(1).find();
    return this.success({
      bannerInfo: {
        url: hot_goods_bannar_url,
        name: hot_goods_title,
        img_url: hot_goods_bannar_url
      }
    });
  }

  /**
   * 商品详情页的大家都在看的商品
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async relatedAction() {
    // 大家都在看商品,取出关联表的商品，如果没有则随机取同分类下的商品
    const model = this.model('goods');
    const goodsId = this.get('id');
    const relatedGoodsIds = await this.model('related_goods').where({goods_id: goodsId}).getField('related_goods_id');
    let relatedGoods = null;
    if (think.isEmpty(relatedGoodsIds)) {
      // 查找同分类下的商品
      const goodsCategory = await model.where({id: goodsId}).find();
      relatedGoods = await model.where({category_id: goodsCategory.category_id}).field(['id', 'name', 'list_pic_url', 'retail_price']).limit(4).select();
    } else {
      relatedGoods = await model.where({id: ['IN', relatedGoodsIds]}).field(['id', 'name', 'list_pic_url', 'retail_price']).select();
    }

    return this.success({
      goodsList: relatedGoods
    });
  }

  /**
   * 在售的商品总数
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async countAction() {
    const goodsCount = await this.model('goods').where({is_delete: 0, is_on_sale: 1}).count('id');

    return this.success({
      goodsCount: goodsCount
    });
  }
};
