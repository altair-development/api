function SearchData(svcLoc) {
    this.nsp = svcLoc.get('searchDataNsp');
};

SearchData.prototype.searchMembers = function (members, searchStr, callerObj, callback) {
    var param = {
        members: members,
        searchStr: searchStr
    }
    this.nsp.emit('searchMembers', param, callback.bind(callerObj));
};

SearchData.prototype.searchPlayTitles = function (playTitles, searchStr, callerObj, callback) {
    var param = {
        playTitles: playTitles,
        searchStr: searchStr
    }
    this.nsp.emit('searchPlayTitles', param, callback.bind(callerObj));
};

SearchData.prototype.searchOpponent = function (clans, searchStr, callerObj, callback) {
    var param = {
        clans: clans,
        searchStr: searchStr
    }
    this.nsp.emit('searchOpponent', param, callback.bind(callerObj));
};