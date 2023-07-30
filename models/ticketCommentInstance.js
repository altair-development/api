const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const TicketCommentInstance = Schema({
    id: {
        type: String,
        default: function(){
            return this._id;
        }
    },
    ticket_id: {
        type: Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    content: {
        type: String,
        default: ''
    },
    deleted: {
        type: Number,
        default: 0
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

module.exports = mongoose.model('TicketComment', TicketCommentInstance)
