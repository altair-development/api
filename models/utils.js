const mongoose = require('mongoose'),
    constant = require('../config/constant'),
    async = require('async');

/* 
*  オブヘクトの中身を新たなプロパティ名で展開して返す関数
*  @param1 object        クランID                       string
*  @param2 nestedObjList 再帰処理するプロパティ名称の配列 string
*  @return               修正済みオブジェクト             object
*/
mongoose.Model.unwindObj = function (object, nestedObjList) {
    // オブジェクト判定用関数を定義
    const isObjFunc = (some) => {
        return some !== null && typeof some === 'object' && !(some instanceof Date) && !(some instanceof mongoose.Types.ObjectId);
    };
    let tmpObject = Object.assign(object); // 引数のオブジェクトに変更を加えない
    for (let key1 in object) {
        const hierarchyOne = object[key1];
        // 展開対象オブジェクトかどうかを判定(Dateオブジェクトインスタンスは対象外)
        const isObj = isObjFunc(hierarchyOne);
        // nullあるいは空オブジェクトを削除
        if (isObj && (Object.keys(hierarchyOne).length == 0) || !hierarchyOne && [0, ''].indexOf(hierarchyOne) === -1) {
            delete tmpObject[key1];
            continue;
        }
        let tmpHierarchyOne = null;
        switch (true) {
            case nestedObjList && nestedObjList.indexOf(key1) >= 0:
                // fight_tickets・work_tickets・notification_ticketsは再帰処理して展開
                // その結果が空の場合は項目を削除
                tmpHierarchyOne = this.unwindObj(hierarchyOne);
                if (tmpHierarchyOne && Object.keys(tmpHierarchyOne).length > 0) {
                    tmpObject[key1] = tmpHierarchyOne;
                } else {
                    delete tmpObject[key1];
                }
                break;
            case isObj:
                tmpHierarchyOne = Object.assign(hierarchyOne);

                // 更に結合しているプロパティが含まれる場合は再帰処理
                for (let key2 in hierarchyOne) {
                    if (isObjFunc(hierarchyOne[key2])) {
                        tmpHierarchyOne = this.unwindObj(hierarchyOne);
                    }
                }

                // オブジェクトを展開
                let deleteFg = true;
                for (let key2 in tmpHierarchyOne) {
                    let newKey = '';
                    // key1_idとかの名称で新規プロパティに追加
                    if (key1.match(/_id$/)) { // key1に既に_idが付いていれば_以降の文字を置換
                        if (key2.indexOf('_') === 0) {
                            newKey = key1;
                            deleteFg = false;
                        } else {
                            newKey = key1.replace(/id$/, key2);
                        }
                    } else {
                        newKey = key2.indexOf('_') === 0 ? key1 + key2 : key1 + '_' + key2;
                    }
                    tmpObject[newKey] = tmpHierarchyOne[key2];
                }
                // key1を文字列置換した場合はプロパティを上書きしているので削除不要
                if (deleteFg) {
                    // 元のオブジェクトを破棄
                    delete tmpObject[key1];
                }
                break;
        }
    }
    return tmpObject;
};
