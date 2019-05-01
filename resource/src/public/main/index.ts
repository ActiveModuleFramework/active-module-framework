///<reference path="../../../dist/public/js/jsw.d.ts"/>

//ページ読み込み時に実行する処理を設定
addEventListener("DOMContentLoaded", Main)

async function Main(){
	const adapter = new JSW.Adapter()
	const result = await adapter.exec('TestModule.add',10,20)
	console.log(result)
}
