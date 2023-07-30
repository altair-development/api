var Routine = {
    // selectAll: function () {
    //     var dfd = new jQuery.Deferred();
    //     var self = this;
    //     // socket.ioに接続
    //     var csrf = $('input[name=_csrf]').val();
    //     this.nsp = io(Utils.getHost() + '/routine' + '?tkn=' + csrf);
    //     // メッセージイベントを送信する
    //     this.nsp.emit('selectAll', '', function (err, result) {
    //         if (err) { // サーバーエラー発生
    //             dfd.reject(err);
    //         } else { // データ取得成功
    //             console.log(result);
    //             // Routing配列に格納する
    //             self.setAllData(result, dfd);
    //         }
    //     });
    //     return dfd.promise();
    // },
    selectRelatedClan: function (first) {
        if (first) {
            // socket.ioに接続
            var csrf = $('input[name=_csrf]').val();
            this.nsp = io(Utils.getHost() + '/routine' + '?tkn=' + csrf);
        }

        var dfd = new jQuery.Deferred();
        var self = this;
        
        // メッセージイベントを送信する
        this.nsp.emit('selectRelatedClan', '', function (err, result) {
            console.log(result);
            if (err) { // サーバーエラー発生
                dfd.reject(err);
            } else { // データ取得成功
                // Routing配列に格納する
                self.setMyClanAll(result, dfd);
            }
        });
        return dfd.promise();
    },
    setMyClanAll: function (result, dfd) {
        this.myClans = result;
        dfd.resolve();
    },
    setMyClan: function (clanId, profile) {
        if (profile.id) {
            delete profile.id;
        }
        this.myClans[clanId] = {
            profile: profile,
            play_titles: [],
            members: [],
            projects: {}
        };
    },
    setProjects: function (clanId, projectId, project) {
        this.myClans[clanId].projects[projectId] = project;
    },
    setPlayTitles: function (clanId, titleId, titleName) {
        if (!this.myClans[clanId].play_titles) {
            this.myClans[clanId].play_titles = [];
        }
        this.myClans[clanId].play_titles.push({
            title_id: titleId,
            title_name: titleName
        });
    },
    setMembers: function (clanId, userId, userName) {
        if (!this.myClans[clanId].members) {
            this.myClans[clanId].members = [];
        }
        this.myClans[clanId].members.push({
            user_id: userId,
            user_name: userName,
            agreement: Const.FLG_NO - 0
        });
    },
    setWatchers: function (clanId, projectId, ticketId, userId, userName) {
        if (!this.myClans[clanId].projects[projectId].tickets[ticketId].watchers) {
            this.myClans[clanId].projects[projectId].tickets[ticketId].watchers[clanId] = {};
        }
        if (!this.myClans[clanId].projects[projectId].tickets[ticketId].watchers[clanId]) {
            this.myClans[clanId].projects[projectId].tickets[ticketId].watchers[clanId] = [];
        }
        this.myClans[clanId].projects[projectId].tickets[ticketId].watchers[clanId].push({
            user_id: userId,
            user_name: userName
        });
    },
    setEntryMembers: function (clanId, projectId, ticketId, userId, userName) {
        if (!this.myClans[clanId].projects[projectId].tickets[ticketId].entry_members) {
            this.myClans[clanId].projects[projectId].tickets[ticketId].entry_members = {};
        }
        if (!this.myClans[clanId].projects[projectId].tickets[ticketId].entry_members[clanId]) {
            this.myClans[clanId].projects[projectId].tickets[ticketId].entry_members[clanId] = [];
        }
        this.myClans[clanId].projects[projectId].tickets[ticketId].entry_members[clanId].push({
            user_id: userId,
            user_name: userName
        });
    },
    setTickets: function (clanId, projectId, ticketId, ticket) {
        this.myClans[clanId].projects[projectId].tickets[ticketId] = ticket;
    },
    setTicketHistories: function (clanId, projectId, ticketId, historyId, history) {
        this.myClans[clanId].projects[projectId].tickets[ticketId].ticket_histories[historyId] = history;
    },
    updateProfile: function (clanId, key, value) {
        this.myClans[clanId].profile[key] = value;
    },
    updateTickets: function (clanId, projectId, ticketId, key, value) {
        this.myClans[clanId].projects[projectId].tickets[ticketId][key] = value;
    },
    updateFightTickets: function (clanId, projectId, ticketId, param1, param2) {
        if ($.isPlainObject(param1)) {
            for (var key in param1) {
                this.myClans[clanId].projects[projectId].tickets[ticketId].fight_tickets[key] = param1[key];
            }
        } else {
            this.myClans[clanId].projects[projectId].tickets[ticketId].fight_tickets[param1] = param2;
        }
    },
    updateWorkTickets: function (clanId, projectId, ticketId, param1, param2) {
        if ($.isPlainObject(param1)) {
            for (var key in param1) {
                this.myClans[clanId].projects[projectId].tickets[ticketId].work_tickets[key] = param1[key];
            }
        } else {
            this.myClans[clanId].projects[projectId].tickets[ticketId].work_tickets[param1] = param2;
        }
    },
    updateNotificationTickets: function (clanId, projectId, ticketId, param1, param2) {
        if ($.isPlainObject(param1)) {
            for (var key in param1) {
                this.myClans[clanId].projects[projectId].tickets[ticketId].notification_tickets[key] = param1[key];
            }
        } else {
            this.myClans[clanId].projects[projectId].tickets[ticketId].notification_tickets[param1] = param2;
        }
    },
    updateLives: function (clanId, projectId, ticketId, params) {
        if ($.isPlainObject(params)) {
            for (var key in params) {
                this.myClans[clanId].projects[projectId].tickets[ticketId].lives[clanId][key] = params[key];
            }
        }
    },
    deletePlayTitles: function (clanId, titleId) {
        var playTitles = this.myClans[clanId].play_titles;
        for (var i = 0; i < playTitles.length; i++) {
            if (String(playTitles[i].title_id) === titleId) {
                playTitles.splice(i, 1);
            }
        }
    },
    deleteMembers: function (clanId, userId) {
        var members = this.myClans[clanId].members;
        for (var i = 0; i < members.length; i++) {
            if (String(members[i].user_id) === userId) {
                members.splice(i, 1);
            }
        }
    },
    deleteWatchers: function (clanId, projectId, ticketId, userId) {
        var watchers = this.myClans[clanId].projects[projectId].tickets[ticketId].watchers[clanId];
        for (var idx in watchers) {
            if (watchers[idx].user_id === userId) {
                watchers.splice(idx, 1);
            }
        }
    },
    deleteEntryMembers: function (clanId, projectId, ticketId, userId) {
        var entryMembers = this.myClans[clanId].projects[projectId].tickets[ticketId].entry_members[clanId];
        for (var idx in entryMembers) {
            if (entryMembers[idx].user_id === userId) {
                entryMembers.splice(idx, 1);
            }
        }
    },
};