module.exports = {
	apps: [{
		name: "tree-type-infomation-service",
		script: "./dist/app/index.js",
		watch: ["./dist/app", "./local_modules/active-module-framework/"],
		instances: 1,
		exec_mode: "cluster_mode",
		log_date_format: "YYYY-MM-DD HH:mm Z",
		merge_logs: true,
		error_file: "./dist/log/error.log",
		out_file: "./dist/log/access.log",
		node_args: ["--no-warnings"],
		env: {
			"NODE_OPTIONS": "--inspect=localhost:9229 --no-warnings"
		}
	}]
}