/* eslint-disable no-multi-spaces */
const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * 获取支付的请求参数
   * @returns {Promise<PreventPromise|void|Promise>}
   */
  async prepayAction() {
    const orderId = this.get('orderId');

    const orderInfo = await this.model('order').where({ id: orderId }).find();
    if (think.isEmpty(orderInfo)) {
      return this.fail(400, '订单已取消');
    }
    if (parseInt(orderInfo.pay_status) !== 0) {
      return this.fail(400, '订单已支付，请不要重复操作');
    }
    const openid = await this.model('user').where({ id: orderInfo.user_id }).getField('weixin_openid', true);
    if (think.isEmpty(openid)) {
      think.logger.warn('找不到openid');
      return this.fail('微信支付失败');
    }
    const WeixinSerivce = this.service('weixin', 'api');
    try {
      //统一下单
      const outTradeNo = orderInfo.order_sn + "" + Math.round(new Date().getTime()/1000);
      const returnParams = await WeixinSerivce.createUnifiedOrder({
        openid: openid,
        // body: '订单编号：' + orderInfo.order_sn,
        // out_trade_no: orderInfo.order_sn,
        body: '商户订单：' + orderInfo.order_sn,
        out_trade_no: outTradeNo,
        total_fee: parseInt(orderInfo.actual_price * 100),
        spbill_create_ip: ''
      });
      console.log("统一下单返回：", returnParams);
      return this.success(returnParams);
    } catch (err) {
      think.logger.warn('微信支付失败', err);
      return this.fail('微信支付失败');
    }
  }

  async notifyAction_new() {
    console.log("----------------weixin notify----------------");
    //获取字节流函数 @return promise
    function parsePostData(http) {
      return new Promise((resolve, reject) => {
        let postdata = "";
        try{
          http.req.addListener('data', data => postdata += data);
          http.req.addListener("end", () => resolve(postdata));
        }catch(err) {
          reject(err);
        }
      })
    }
    //XML字符串转对象函数 @return promise
    const xml2obj = xmlStr => new Promise((resolve, reject) => 
      parseString(xmlStr, (err, result) => resolve(result))
    );
    //验证返回结果是否正常服务
    const WeixinSerivce = this.service('weixin', 'api');
    const WS = WeixinSerivce;
    // 获取兼容ctx
    const ctx = this.ctx || this.http;
    console.log("http.req", ctx.req);
    // 获取字节流（字符串）
    const string = await parsePostData(ctx);
    console.log("notify string: ", string);
    // 字符串转对象
    const obj = await xml2obj(string);
    console.log("notify obj: ", obj);
    // 检验是否成功支付
    const result = WS.payNotify(obj['xml']);
    console.log("notify result: ", result);
      console.log("result", result);
    // 结果未通过检验
    if(!result)
      return this.success(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付失败]]></return_msg></xml>`);
    
    // 查找订单对应产品信息
    const { out_trade_no } = result;
    console.log("result.out_trade_no is ", result.out_trade_no);
    const productInfo = await this.model("product").where({ order_sn: out_trade_no }).find();
    
    // 如果已经收到支付成功该信息则返回错误
    if(productInfo.is_pay === 1){
      console.log("已经支付成功");
      return this.success(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[已经支付成功]]></return_msg></xml>`);
    }
    
    // 不存在则返回错误
    if (think.isEmpty(productInfo)) 
      return this.success(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`);
    
    // 更新支付状态
    const update_result = await this.model("order").where({ order_sn: out_trade_no }).update({ is_pay: 1});
    if(!update_result);
      return this.success(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`);
    
    return this.success(`<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`);
  }

  async notifyAction() {
    const WeixinSerivce = this.service('weixin', 'api');
    const result = WeixinSerivce.payNotify(this.post('xml'));
    think.logger.debug("notify post XML", result);
    if (!result) {
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付失败]]></return_msg></xml>`;
    }

    const orderModel = this.model('order');
    const orderSn = result.out_trade_no.substring(0, 20);
    const orderInfo = await orderModel.getOrderByOrderSn(orderSn);
    think.logger.debug("result.out_trade_no is ", result.out_trade_no);
    think.logger.debug("orderInfo is ", orderInfo);    // 如果已经收到支付成功该信息则返回错误


    if (think.isEmpty(orderInfo)) {
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`;
    }
    
    if(orderInfo.pay_status === 2){
      console.log("已经支付成功");
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[已经支付成功]]></return_msg></xml>`;
    }

    orderInfo.pay_status == 1;

    if (orderModel.updatePayStatus(orderInfo.id, 2)) {
    } else {
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`;
    }

    return `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`;
  }
};
