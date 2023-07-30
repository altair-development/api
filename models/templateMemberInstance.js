const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const TemplateMemberInstance = Schema({
    id: {
        type: String,
        default: function(){
            return this._id;
        }
    },
    template_id: {
        type: Schema.Types.ObjectId,
        ref: 'MemberTemplate'
    },
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    created: Date,
    modified: {
        type: Date,
        default: function(){
            // 新規作成時はcreatedの値
            // それ以外は現在時刻
            if(this.created) return this.created;
            const date = new Date;
            return date.setTime(date.getTime() + 1000*60*60*9);
        }
    }
});

module.exports = mongoose.model('TemplateMember', TemplateMemberInstance)
