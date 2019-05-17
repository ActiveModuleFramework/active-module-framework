///<reference path="../../../dist/public/js/jwf.d.ts"/>

//ページ読み込み時に実行する処理を設定
addEventListener("DOMContentLoaded", Main)

function Main() {
	//通信アダプタの作成
	const adapter = new JWF.Adapter()

	//ウインドウを作成
	const window = new JWF.FrameWindow()
	window.setTitle('サンプルテンプレート')
	window.setSize(450, 100)
	window.setPos()

	//ウインドウクライアントノードの取得とHTMLデータの設定
	const client = window.getClient()
	client.style.padding = '1em'
	client.innerHTML = `<input> + <input> <button>=</button> <span>？</span>`

	//各ノードの取得
	const nodes = client.querySelectorAll('input,button,span')
	//ボタンイベントの処理
	nodes[2].addEventListener('click', async () => {
		//Inputタグから内容を取り出す
		const a = parseInt((nodes[0] as HTMLInputElement).value)
		const b = parseInt((nodes[1] as HTMLInputElement).value)
		//サーバにデータを送信し、受信完了まで待つ
		const result = await adapter.exec('TestModule.add', a, b)
		//結果を書き込む
		nodes[3].textContent = result
	})
}
