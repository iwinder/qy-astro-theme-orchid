/**
 * ::github{repo="owner/repo"} → GitHub 仓库卡片（A2，移植自参考模板
 * rehype-component-github-card）
 *
 * remarkDirectives 已把 leaf 指令转成 <github repo="…"> 标签；本插件将其替换为
 * 卡片结构 + 内联脚本：客户端 fetch api.github.com 填充描述/stars/forks/
 * license/头像；fetch-waiting（骨架 pulsate 动画）→ 完成态 / fetch-error 两态。
 * 数据获取发生在读者浏览器端，构建期零请求。
 */
import { h } from "hastscript";

function githubCard(properties: any, children: any[]): any {
	if (Array.isArray(children) && children.length !== 0)
		return h(
			"div",
			{ class: "hidden" },
			`Invalid directive. ("github" directive must be leaf type '::github{repo="owner/repo"}')`,
		);

	const repo = String(properties.repo ?? "");
	if (!repo.includes("/"))
		return h(
			"div",
			{ class: "hidden" },
			`Invalid repository. ("repo" attribute must be in the format "owner/repo")`,
		);

	// 每卡片随机 id 防同页多卡片串数据（碰撞概率可忽略）
	const cardUuid = `GC${Math.random().toString(36).slice(-6)}`;

	const nAvatar = h(`div#${cardUuid}-avatar`, { class: "gc-avatar" });
	const nLanguage = h(
		`span#${cardUuid}-language`,
		{ class: "gc-language" },
		"Waiting...",
	);

	const nTitle = h("div", { class: "gc-titlebar" }, [
		h("div", { class: "gc-titlebar-left" }, [
			h("div", { class: "gc-owner" }, [
				nAvatar,
				h("div", { class: "gc-user" }, repo.split("/")[0]),
			]),
			h("div", { class: "gc-divider" }, "/"),
			h("div", { class: "gc-repo" }, repo.split("/")[1]),
		]),
		h("div", { class: "github-logo" }),
	]);

	const nDescription = h(
		`div#${cardUuid}-description`,
		{ class: "gc-description" },
		"Waiting for api.github.com...",
	);

	const nStars = h(`div#${cardUuid}-stars`, { class: "gc-stars" }, "00K");
	const nForks = h(`div#${cardUuid}-forks`, { class: "gc-forks" }, "0K");
	const nLicense = h(`div#${cardUuid}-license`, { class: "gc-license" }, "0K");

	const nScript = h(
		`script#${cardUuid}-script`,
		{ type: "text/javascript" },
		`
      fetch('https://api.github.com/repos/${repo}', { referrerPolicy: "no-referrer" }).then(response => response.json()).then(data => {
        document.getElementById('${cardUuid}-description').innerText = data.description?.replace(/:[a-zA-Z0-9_]+:/g, '') || "Description not set";
        document.getElementById('${cardUuid}-language').innerText = data.language;
        document.getElementById('${cardUuid}-forks').innerText = Intl.NumberFormat('en-us', { notation: "compact", maximumFractionDigits: 1 }).format(data.forks).replaceAll("\\u202f", '');
        document.getElementById('${cardUuid}-stars').innerText = Intl.NumberFormat('en-us', { notation: "compact", maximumFractionDigits: 1 }).format(data.stargazers_count).replaceAll("\\u202f", '');
        const avatarEl = document.getElementById('${cardUuid}-avatar');
        avatarEl.style.backgroundImage = 'url(' + data.owner.avatar_url + '&s=32' + ')';
        avatarEl.style.backgroundColor = 'transparent';
        document.getElementById('${cardUuid}-license').innerText = data.license?.spdx_id || "no-license";
        document.getElementById('${cardUuid}-card').classList.remove("fetch-waiting");
      }).catch(err => {
        document.getElementById('${cardUuid}-card')?.classList.add("fetch-error");
      })
    `,
	);

	return h(
		`a#${cardUuid}-card`,
		{
			class: "card-github fetch-waiting",
			href: `https://github.com/${repo}`,
			target: "_blank",
		},
		[
			nTitle,
			nDescription,
			h("div", { class: "gc-infobar" }, [nStars, nForks, nLicense, nLanguage]),
			nScript,
		],
	);
}

export function rehypeGithubCard(): any {
	return (tree: any) => {
		const walk = (node: any) => {
			if (!Array.isArray(node.children)) return;
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];
				if (child.type === "element" && child.tagName === "github") {
					node.children[i] = githubCard(
						child.properties ?? {},
						child.children ?? [],
					);
				} else {
					walk(child);
				}
			}
		};
		walk(tree);
	};
}
