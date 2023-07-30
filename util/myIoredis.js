const express = require('express'),
      ioredis = require('ioredis'),
      app = express(),
      config = require('../config/config')[app.get('env')];

class myIoredis extends ioredis {
    constructor() {
        let redis_address = null;
        if (app.get('env') === 'development') {
            // redis server (master) にアクセス
            redis_address = config.redis.replication;
            
        } else {
            // redis sentinel にアクセス
            const sentinels = [],
                  redis_stnl_hosts = process.env.REDIS_STNL_HOSTS.split(','),
                  redis_stnl_ports = process.env.REDIS_STNL_PORTS.split(',');
            
            for (let idx in redis_stnl_hosts) {
                sentinels.push({
                    host: redis_stnl_hosts[idx],
                    port: redis_stnl_ports[idx]
                });
            }
            redis_address = {
                sentinels,
                name: "mymaster",
                password: process.env.REDIS_DB_PASS
            };
        }
        super(redis_address);
    }
}

module.exports = myIoredis;